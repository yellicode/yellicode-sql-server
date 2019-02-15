import * as elements from '@yellicode/elements';
import { Logger, ConsoleLogger } from '@yellicode/core';
import { TypeNameProvider } from '@yellicode/templating';
import { Database, Table, Column } from './model/database';
import { TypeAssociationInfo } from './model/type-association-info';
import { TypeAssociationMapBuilder } from './type-association-map-builder';
import { SqlObjectNameProvider, DefaultSqlObjectNameProvider } from './providers/sql-object-name-provider';
import { SqlColumnSpecProvider, DefaultSqlColumnSpecProvider } from './providers/sql-column-spec-provider';
import { AnsiSqlTypeNameProvider } from './providers/ansi-sql-type-name-provider';
import { SqlUtility } from './utils/sql-utility';
import { DbOptions } from './db-options';
import { TableSortUtility } from './utils/table-sort-utility';


/**
 * Internal interface.
 */
interface ColumnRelationShip {
    column: Column;
    primaryKeyType: elements.Type;
}

export class DbBuilder<TDatabase extends Database<TTable>, TTable extends Table<TColumn>, TColumn extends Column> {
    private columnRelationships: ColumnRelationShip[];
    protected logger: Logger;
    protected objectNameProvider: SqlObjectNameProvider;
    protected columnSpecProvider: SqlColumnSpecProvider;
    protected typeNameProvider: TypeNameProvider;

    private tableFilters: ((type: elements.Type) => boolean)[];

    constructor(options?: DbOptions, logger?: Logger) {
        this.logger = logger || new ConsoleLogger(console);
        if (!options) options = {};

        this.typeNameProvider = options.typeNameProvider || new AnsiSqlTypeNameProvider();
        this.objectNameProvider = options.objectNameProvider || new DefaultSqlObjectNameProvider();
        this.columnSpecProvider = options.columnSpecProvider || new DefaultSqlColumnSpecProvider();
        this.tableFilters = [];
        this.columnRelationships = [];
    }

    /**
     * Adds a filter expression that filters out the types from which the builder should create tables.
     * You can add multiple filters by calling this function multiple times, the filters will be applied
     * in the order in which you call them.
     * @param predicate A function that returns true if a table should be created for the given type. 
     */
    public addTableFilter(predicate: (type: elements.Type) => boolean): this {
        this.tableFilters.push(predicate);
        return this;
    }

    protected /*virtual*/ createDatabase(db: Database, model: elements.Model, associationMap: Map<elements.Type, TypeAssociationInfo[]>): TDatabase {
        return db as TDatabase;
    }

    protected  /*virtual*/ createTable(table: Table, type: elements.Type | null): TTable {
        // if (table.dependentColumns.length){
        //     console.log(`Table ${table.name} has ${table.dependentColumns.length} dependent columns:`);
        //     table.dependentColumns.forEach(c => {
        //         console.log(`Column ${c.table.name}.${c.name}`);
        //     });
        // }
        return table as TTable;
    }

    protected /*virtual*/ createColumn(column: Column, property: elements.Property): TColumn {
        return column as TColumn;
    }

    public /*virtual*/ build(model: elements.Model): TDatabase {
        // First get all association info from the model
        const associationMapBuilder = new TypeAssociationMapBuilder(this.columnSpecProvider);
        const allAssociations = model.packagedElements.filter(pe => elements.isAssociation(pe)) as elements.Association[];
        const associationMap = associationMapBuilder
            .addAssociations(allAssociations)
            .addNonAssociationRelations(model) // Get other relationships and treat them as associations too
            .getMap();

        // DbBuilder.logAssociations(associationMap); // TEMP                

        const tablesInternal: Table[] = [];
        // Build tables from types in the model
        const types = model.getAllTypes();
        types.forEach(t => {
            if (!this.shouldCreateTableForType(t))
                return;
           
            const table: Table | null = this.buildTableDefinitionFromType(t, associationMap);
            if (table) {
                this.logger.verbose(`Created table '${table.name}' from type '${t.name}'.`);
                tablesInternal.push(table);
            }
        });

        // TODO: Build junction tables from M-M associations

        // Resolve column relationships, before we call the 'createTable()' implementation for each table.
        this.resolveColumnRelationships(tablesInternal);
        this.columnRelationships.length = 0; // clear the array

        // Sort tables, avoiding issues when creating FK's. Do this after resolveColumnRelationships()! Note that we do not 
        // build a dependency graph on the underlying object model itself because the dependencies might run in a different direction 
        // in the relational model. 
        const sortedTables = TableSortUtility.sortByDependency(tablesInternal);
        const tables: TTable[] = [];
        sortedTables.forEach(t => {
            tables.push(this.createTable(t, t.sourceType));
        });

        return this.createDatabase({ tables: tables }, model, associationMap);
    }

    private resolveColumnRelationships(tables: Table[]): void {
        // Create a map to find the table by type
        const tableByType: Map<elements.Type, Table> = new Map<elements.Type, Table>();
        tables.forEach(t => {
            if (t.sourceType) { tableByType.set(t.sourceType, t); }
        });

        this.columnRelationships.forEach(r => {
            //  const sourcePropertyName = r.column.sourceProperty ? r.column.sourceProperty.name : 'unnamed'
            //  console.log(`Adding FK column '${r.column.table.name}.${r.column.name} (${sourcePropertyName})' as dependent column on table for PK type '${r.primaryKeyType.name}'`);
            const table = tableByType.get(r.primaryKeyType);
            if (table) {
                table.dependentColumns.push(r.column);
            }
        });
    }

    private shouldCreateTableForType(type: elements.Type): boolean {
        // If there are no filters, include everything (todo: perhaps we should reverse this selection,
        // e.g. what if we only want to build table types or stored procs?)
        if (!this.tableFilters || !this.tableFilters.length)
            return true;

        // Find the first filter that excludes the type
        const filter = this.tableFilters.find(p => {
            return p(type) === false
        });
        if (filter) {
            return false;
        }
        return true;
    }

    protected buildTableDefinitionFromType(type: elements.Type, associationMap: Map<elements.Type, TypeAssociationInfo[]>): Table | null {
        if (!type.name.length) {
            this.logger.warn(`Cannot build a table definition from type '${type.id}' because the type has no name.`);
            return null;
        }

        const ownColumns: TColumn[] = [];
        const tableName = this.objectNameProvider.getTableName(type);
        const table: Table = {
            name: tableName,
            sourceType: type,
            isJunctionTable: false,
            ownColumns: ownColumns,
            dependentColumns: []
        };
        if (elements.isMemberedClassifier(type)) {
            // Build ownColumns
            type.ownedAttributes.forEach(property => {
                const isForeignKey = property.owner == type && this.columnSpecProvider.isRelationship(property);
                if (isForeignKey && property.isMultivalued()) {
                    // The property is a member of a 1-to-M or M-to-M relationship. 
                    // The FK column should be on the other table (1-to-M) or in a join table (M-to-M).
                    // This is handled through the associationMap on the other type.            
                    //  this.logger.verbose(`Not creating a column for property '${type.name}.${property.name}' on table '${tableName}' because it is multivalued.`);
                    return null;
                }
                else {
                    const column = this.buildColumnDefinitionFromProperty(table, type, property, tableName, isForeignKey);
                    if (column) { ownColumns.push(column) };
                };
            });
        }

        // Write column definitions from 1-M relationships: e.g. (Department [1] - Employee [1..*]), and this is the Employee table, 
        // give the Employee table a DepartmentId.
        const associations = associationMap.get(type);
        if (associations) {
            associations.forEach(a => {
                // If the property owned by a type (and not by the association), skip column generation
                // because the column will already be there (e.g. entityEnd is a property Department on Employee)                  
                if (a.fromPropertyIsOwnedByType)
                    return;

                // Is this a 1-to-M relationship, meaning: does the opposite end allow multiple instances of type and does the type
                // only allow one instance of the opposite type)?                
                if (!a.isOneToMany)
                    return;

                // Get the column name. Note that we cannot call this.getColumnName(entityEnd), because property won't have a no name (otherwise it would 
                // be a property - fromPropertyIsOwnedByType - and already be handled).
                const idProperty = SqlUtility.findIdentityProperty(a.fromType);
                if (!idProperty) {
                    throw `Could not create FK property for type '${a.fromType.name}' on table '${tableName}' because the type's identity property could not be determined.`;
                }
                // E.g. DepartmentId
                // Get a column name for the association property first. 
                const idColName = this.objectNameProvider.getColumnName(idProperty);
                const role = this.objectNameProvider.getColumnName(a.fromProperty); // result can be empty if the association end is unnamed
                const colName = role ? `${idColName}_${role}`: idColName;                

                this.logger.verbose(`Adding column '${type.name}.${colName}' due to a 1-M relationship '${a.fromType.name}.${a.fromProperty.name}' where ${type.name} has no navigable attribute for ${a.fromType.name}.`);                
                
                const column = this.buildColumnDefinition(table, role, a.fromProperty, idProperty, colName, true, false);
                if (column) {
                    column.isMany = true;
                    ownColumns.push(column);
                    this.columnRelationships.push({ column: column, primaryKeyType: a.fromType });
                };
            })
        }

        return table;
    }

    private buildColumnDefinition(
        table: Table,        
        role: string | null,
        sourceProperty: elements.Property,
        primaryKeyProperty: elements.Property | null,
        name: string,
        isForeignKey: boolean,
        isNavigable: boolean): TColumn | null {
        // If there is a referencesProperty, this property is the PK, and the PK determines the sql server column type of a FK
        const propertyForSqlTypeName = isForeignKey && primaryKeyProperty ? primaryKeyProperty : sourceProperty;
        const sqlTypeName = this.getSqlTypeName(propertyForSqlTypeName);
        
        return this.createColumn({
            table: table,       
            role: role || undefined,     
            sourceProperty: sourceProperty,
            primaryKeyProperty: primaryKeyProperty || undefined,
            name: name,
            typeName: sqlTypeName,
            length: this.columnSpecProvider.getLength(sqlTypeName, sourceProperty),
            precision: this.columnSpecProvider.getPrecision(sqlTypeName, sourceProperty),
            scale: this.columnSpecProvider.getScale(sqlTypeName, sourceProperty),
            isIdentity: !isForeignKey && sourceProperty.isID,
            isRequired: !sourceProperty.isOptional() || sourceProperty.isID,
            isForeignKey: isForeignKey,
            isNavigableInModel: isNavigable
        }, sourceProperty);
    }

    private buildColumnDefinitionFromProperty(table: Table, sourceType: elements.Type, property: elements.Property, tableName: string, isForeignKey: boolean): TColumn | null {
        if (!property.name.length) {
            this.logger.warn(`Cannot create a column definition from property '${sourceType.name}.${property.id}' on table '${tableName}' because the property has no name.`);
            return null;
        }
        const colName = isForeignKey ? this.objectNameProvider.getForeignKeyColumnName(property) : this.objectNameProvider.getColumnName(property);
        let primaryKeyProperty: elements.Property | null;
        if (isForeignKey && property.type) {
            primaryKeyProperty = SqlUtility.findIdentityProperty(property.type);
        }
        else primaryKeyProperty = null;        

        return this.buildColumnDefinition(table, null, property, primaryKeyProperty, colName, isForeignKey, true);
    }

    /**
   * Uses the current typeNameProvider to get the sql type name for the specified type.     
   */
    protected getSqlTypeName(typedElement: elements.TypedElement): string {
        let typeName = this.typeNameProvider.getTypeName(typedElement);
        if (!typeName || typeName.length === 0) {
            const ownerName = elements.isNamedElement(typedElement.owner) ? typedElement.owner.name : '';
            throw `Unable to determine sql type name of typed element '${ownerName}.${typedElement.name}'. Please make sure that the element has a valid type.`
        }
        return typeName;
    }

    protected getIdentityColumnName(type: elements.Type): string {
        const idProperty = SqlUtility.findIdentityProperty(type);
        if (!idProperty) {
            throw `Unable to determine identity column name of type '${type.name || type.id}'. The type has no attribute with isID set to true.`
        }
        return this.objectNameProvider.getColumnName(idProperty);
    }

    private static logAssociations(map: Map<elements.Type, TypeAssociationInfo[]>): void {
        map.forEach((value: TypeAssociationInfo[], key: elements.Type) => {
            console.log('');
            console.log(`Associations to type '${key.name}':`);
            value.forEach(v => {
                // 
                const fromPropertyName = v.fromProperty.name || '[unnamed property]';
                const toPropertyName = v.toProperty ? v.toProperty.name || '[unnamed property]' : '[no property]';
                console.log(`     From '${v.fromType.name}.${fromPropertyName}' to '${v.toType.name}.${toPropertyName}' (1-M: ${v.isOneToMany})`);
            });
        });
    }
}