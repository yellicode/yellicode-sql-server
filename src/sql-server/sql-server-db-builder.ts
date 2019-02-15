import * as elements from '@yellicode/elements';
import { Database, Table, Column } from '../relational/model/database';
import { SqlServerDatabase, SqlServerTable, SqlServerColumn, SqlServerKey, SqlServerKeyType, SqlServerStoredProcedure, QueryType } from './model/sql-server-database';
import { Logger } from '@yellicode/core';
import { DbBuilder } from '../relational/db-builder';
import { SqlServerTypeNameProvider } from './providers/sql-server-type-name-provider';
import { SqlServerObjectNameProvider, DefaultSqlServerObjectNameProvider } from './providers/sql-server-object-name-provider';
import { SqlServerColumnSpecProvider, DefaultSqlServerColumnSpecProvider } from './providers/sql-server-column-spec-provider';
import { SqlServerDbOptions } from './sql-server-db-options';
import { StoredProcedureBuilder } from './stored-procedure-builder';
import { SqlServerTypeFactory } from './sql-server-type-factory';
import { TypeAssociationInfo } from '../relational/model/type-association-info';

declare type StoredProcedureKind = 'Insert' | 'UpdateById' | 'SelectById' | 'DeleteById';

export class SqlServerDbBuilder extends DbBuilder<SqlServerDatabase, SqlServerTable, SqlServerColumn> {
    private sqlServerObjectNameProvider: SqlServerObjectNameProvider;
    private sqlServerColumnSpecProvider: SqlServerColumnSpecProvider;
    private simpleTableTypes: elements.Type[];
    private tableTypeSelectors: ((type: elements.Type) => boolean)[];
    private storedProceduresMap: Map<string, ((type: elements.Type, table: SqlServerTable) => boolean)[]>;

    /**
     * The sql type name of the identity. We only need this to correctly generate a
     * table type that we can use to pass a list of ids.
     */
    private identityType: elements.Type;

    constructor(options?: SqlServerDbOptions, logger?: Logger) {
        if (!options) options = {};
        
        // Set defaults
        if (!options.typeNameProvider) options.typeNameProvider = new SqlServerTypeNameProvider();
        if (!options.objectNameProvider) options.objectNameProvider = new DefaultSqlServerObjectNameProvider();
        if (!options.columnSpecProvider) options.columnSpecProvider = new DefaultSqlServerColumnSpecProvider();

        super(options, logger);

        this.tableTypeSelectors = [];
        this.simpleTableTypes = []; // TODO: remove

        // Set the identityType
        this.identityType = options.identityType || SqlServerTypeFactory.createInt();

        this.sqlServerObjectNameProvider = options.objectNameProvider;
        this.sqlServerColumnSpecProvider = options.columnSpecProvider;
        this.storedProceduresMap = new Map<string, ((type: elements.Type, table: SqlServerTable) => boolean)[]>();
    }

    // public get ObjectNameProvider(): SqlServerObjectNameProvider {
    //     return this.sqlServerObjectNameProvider;
    // }

    /**
    * OBSOLETE Adds a single-column table type, of which the column type matches the specified data type.
    * @param type A data type that can be directly mapped to a sql type.
    * @param options The table options.
    */
    public addSimpleTableType(type: elements.Type): this {
        this.simpleTableTypes.push(type);
        return this;
    }

    public addTableTypes(selector: (type: elements.Type) => boolean): this {
        this.tableTypeSelectors.push(selector);
        return this;
    }
    
    protected addProdecures(kind: string, selector?: (type: elements.Type, table: SqlServerTable) => boolean): this {
        let selectorsByKind = this.storedProceduresMap.get(kind) || [];
        if (selector) {
            selectorsByKind.push(selector);
        }
        else if (selectorsByKind.length) {
            // caller has overridden a previous "add..." call with an unfiltered one
            selectorsByKind.length = 0;
        }
        this.storedProceduresMap.set(kind, selectorsByKind);
        return this;
    }

    /**
     * Causes the creation of a "insert" stored procedure for each table. A selector expression can be provided to
     * limit the types/tables to create the procedure for. Calling this function multiple times with different selectors
     * will expand the selection.
     * @param selector A selector to filter out the tables for which to create the stored procedure. Leave empty
     * to create the stored procedure for each table.
     */
    public addProceduresForInsert(selector?: (type: elements.Type, table: SqlServerTable) => boolean): this {
        const kind: StoredProcedureKind = "Insert";
        return this.addProdecures(kind, selector);
    }

    /**
    * Causes the creation of a "update" stored procedure for each table. A selector expression can be provided to
    * limit the types/tables to create the procedure for. Calling this function multiple times with different selectors
    * will expand the selection.
    * @param selector A selector to filter out the tables for which to create the stored procedure. Leave empty
    * to create the stored procedure for each table.
    */
    public addProceduresForUpdateById(selector?: (type: elements.Type, table: SqlServerTable) => boolean): this {
        const kind: StoredProcedureKind = "UpdateById";
        return this.addProdecures(kind, selector);
    }

    /**
     * Causes the creation of a "select by id" stored procedure for each table. A selector expression can be provided to
     * limit the types/tables to create the procedure for. Calling this function multiple times with different selectors
     * will expand the selection.
     * @param selector A selector to filter out the tables for which to create the stored procedure. Leave empty
     * to create the stored procedure for each table.
     */
    public addProceduresForSelectById(selector?: (type: elements.Type, table: SqlServerTable) => boolean): this {
        const kind: StoredProcedureKind = "SelectById";
        return this.addProdecures(kind, selector);
    }

    /**
    * Causes the creation of a "delete by id" stored procedure for each table. A selector expression can be provided to
    * limit the types/tables to create the procedure for. Calling this function multiple times with different selectors
    * will expand the selection.
    * @param selector A selector to filter out the tables for which to create the stored procedure. Leave empty
    * to create the stored procedure for each table.
    */
    public addProceduresForDeleteById(selector?: (type: elements.Type, table: SqlServerTable) => boolean): this {
        const kind: StoredProcedureKind = "DeleteById";
        return this.addProdecures(kind, selector);
    }


    // public /*override*/ build(model: elements.Model): SqlServerDatabase {
    //     var database = super.build(model);

    //     // Add PK and FK constraints to tables
    //     this.createKeys(database);

    //     // Create table types
    //     const identityTableType = this.createTableTypes(model, database);

    //     // Create stored procedures        
    //     this.buildProcedures(database, identityTableType);
    //     return database;
    // }

    protected /*override*/ createDatabase(db: Database, model: elements.Model,
        associationMap: Map<elements.Type, TypeAssociationInfo[]>): SqlServerDatabase {

        var database = super.createDatabase(db, model, associationMap);
        // Add PK and FK constraints to tables
        this.createKeys(database);

        // Create table types
        const identityTableType = this.createTableTypes(model, database, associationMap);

        // Create stored procedures        
        this.buildProcedures(database, identityTableType);
        return database;
    }

    protected /*override*/ createColumn(column: Column, property: elements.Property): SqlServerColumn {
        var sqlServerColumn = super.createColumn(column, property);
        return sqlServerColumn;
    }

    private buildProcedures(database: SqlServerDatabase, identityTableType: SqlServerTable): void {
         // Inialize nested builders
        const storedProcedureBuilder = new StoredProcedureBuilder(this.sqlServerObjectNameProvider, identityTableType, this.logger);

        database.tables.forEach(table => {
            const sourceType = table.sourceType;
            if (!sourceType)
                return; // no sourceType means a junction table

            // this.logger.info(`Building stored procedures for ${table.name}`);

            // Enumerate the stored procedure kinds
            this.storedProceduresMap.forEach((selectors: ((type: elements.Type, table: SqlServerTable) => boolean)[], kind: string) => {
                if (!SqlServerDbBuilder.shouldCreateProcedureForType(sourceType, table, selectors))
                    return;

                this.buildAndAddProcedure(kind, table, sourceType, storedProcedureBuilder);
            });
        });

        database.storedProcedures = storedProcedureBuilder.getResult();
    }

    protected /*virtual*/ buildAndAddProcedure(kind: string, table: SqlServerTable, type: elements.Type, builder: StoredProcedureBuilder): void {
       // this.logger.info(`Creating stored procedure of kind '${kind}' for table '${table.name}' (type '${type.name})'`);
        switch (kind) {
            case 'Insert':
                builder.buildInsert(table, type);
                break;
            case 'UpdateById':
                builder.buildUpdateById(table, type);
                break;
            case 'SelectById':
                builder.buildSelectById(table, type)
                break;
            case 'DeleteById':
                builder.buildDeleteById(table, type);
                break;
            default:
                this.logger.warn(`Did not build a stored procedure of kind '${kind}' for table '${table.name}'. This stored procedure kind is not supported.`);
                break;
        }
    }

    private createSimpleTableType(type: elements.Type, sqlTypeName: string): SqlServerTable {
        const tableTypeName = this.sqlServerObjectNameProvider.getSimpleTableTypeName(type, sqlTypeName);
        const columnName = this.sqlServerObjectNameProvider.getSimpleTableTypeColumnName(sqlTypeName);

        const table: SqlServerTable = {
            name: tableTypeName,
            sourceType: type,
            isJunctionTable: false,
            keys: [],
            ownColumns: [],
            dependentColumns: []
        }
        
        const column: SqlServerColumn = {
            table: table,
            name: columnName,
            typeName: sqlTypeName,
            isForeignKey: false,
            isIdentity: false,
            isRequired: true,
            isNavigableInModel: false,
            length: this.columnSpecProvider.getLength(sqlTypeName),
            precision: this.columnSpecProvider.getPrecision(sqlTypeName),
            scale: this.columnSpecProvider.getScale(sqlTypeName)
        };
        table.ownColumns.push(column);
        return table;
    }
   
    private createComplexTableType(type: elements.Type, associationMap: Map<elements.Type, TypeAssociationInfo[]>): SqlServerTable | null {
        var tableType = this.buildTableDefinitionFromType(type, associationMap);
        if (tableType) {
            // TODO: override the name
            tableType.name = this.sqlServerObjectNameProvider.getComplexTableTypeName(type);
            return this.createTable(tableType, type);
        }
        return null;
    }

    private createTableTypes(model: elements.Model, database: SqlServerDatabase, associationMap: Map<elements.Type, TypeAssociationInfo[]>): SqlServerTable {
        const tableTypes: SqlServerTable[] = [];
        const types = model.getAllTypes();

        const identityTypeName = this.typeNameProvider.getTypeName(this.identityType);

        let identityTableType: SqlServerTable | null = null;

        types.forEach(t => {
            if (!this.shouldCreateTableTypeForType(t))
                return;

            let tableType: SqlServerTable | null;
            if (this.sqlServerColumnSpecProvider.requiresSimpleTableType(t)) {
                // Make a simple (single column) table type
                const sqlTypeName = this.typeNameProvider.getTypeName(t);
                if (!sqlTypeName) {
                    return console.log(`Cannot create simple table type for type '${t.name}'. Could not map this type to a sql type.`);
                }
                tableType = this.createSimpleTableType(t, sqlTypeName);
                if (sqlTypeName === identityTypeName) {
                    identityTableType = tableType;
                }
            }
            else {
                // Make a complex (multi column) table type
                tableType = this.createComplexTableType(t, associationMap);
                // tableType = null;
                // this.logger.info(`TODO: create complex table type for type '${t.name}'.`)
            }
            if (tableType) {
                tableTypes.push(tableType);
            }
        });

        // this.simpleTableTypes.forEach(type => {
        //     const sqlTypeName = this.typeNameProvider.getTypeName(type);
        //     if (!sqlTypeName) {
        //         return console.log(`Cannot create simple table type for type '${type.name}'. Could not map this type to a sql type.`)
        //     }
        //     const table = this.createSimpleTableType(type, sqlTypeName);
        //     tableTypes.push(table);

        //     if (sqlTypeName === identityTypeName) {
        //         identityTableType = table;
        //     }
        // });

        if (!identityTableType) {
            // Ensure a table type for the identity, some generated stored procedures depend on it
            identityTableType = this.createSimpleTableType(this.identityType, identityTypeName!);
            tableTypes.push(identityTableType);
        }

        database.tableTypes = tableTypes;
        return identityTableType;
    }

    private createKeys(database: SqlServerDatabase): void {
        database.tables.forEach(table => {
            const keys: SqlServerKey[] = [];
            table.ownColumns.forEach(col => {
                if (col.isForeignKey) {
                    const fk = this.createForeignKey(col);
                    if (fk) { keys.push(fk) };
                }
                if (col.isIdentity && table.sourceType) {
                    // TODO: only one column per table may be an IDENTITY column, and a column can be an identity without being a PK.
                    // For now, assume one ID which is also the PK. In the future we could create a stereotype to identify the primary key (or composite key).
                    const pk = this.createPrimaryKey(col, table.sourceType);
                    keys.push(pk);
                }
            });
            table.keys = keys;
        });
    }

    private createForeignKey(column: SqlServerColumn): SqlServerKey | null {
        // let primaryTableType: elements.Type;// = elements.isAssociation(property.owner) ? property.type! : property.owner as elements.Type;
        // if (elements.isAssociation(property.owner)) {
        //     const associationEnds = SqlUtility.resolveAssociationEnds(property.owner, property.type!);
        //     primaryTableType = associationEnds!.entityEnd.type!;
        // }
        // else {
        //     primaryTableType = property.owner as elements.Type;
        // }

        //   const primaryTableType = property.owner as elements.Type;
        const constraintName = this.sqlServerObjectNameProvider.getForeignKeyName(column.sourceProperty!, column.primaryKeyProperty!);
        const pkTableType = column.primaryKeyProperty!.owner as elements.Type;
        const pkTableName = this.objectNameProvider.getTableName(pkTableType);
        const pkColumnName = this.getIdentityColumnName(pkTableType);

        return {
            columnName: column.name,
            keyType: SqlServerKeyType.Foreign,
            name: constraintName,
            cascadeOnDelete: false,// TODO: column.sourceProperty!.aggregation === elements.AggregationKind.composite,
            primaryKeyTableName: pkTableName,
            primaryKeyColumnName: pkColumnName
        }
    }

    private createPrimaryKey(column: SqlServerColumn, type: elements.Type): SqlServerKey {
        const constraintName = this.sqlServerObjectNameProvider.getPrimaryKeyName(type);
        return {
            columnName: column.name,
            keyType: SqlServerKeyType.Primary,
            name: constraintName,
            cascadeOnDelete: false,
            primaryKeyTableName: null, // FK only
            primaryKeyColumnName: null // FK only
        }
    }

    //#region utility functions
    private static shouldCreateProcedureForType(type: elements.Type,
        table: SqlServerTable,
        includes: ((type: elements.Type, table: SqlServerTable) => boolean)[]): boolean {

        if (!includes.length)
            return true; // no filter: include

        // Find the first selector that includes the type
        const include = includes.find(p => {
            return p(type, table) === true
        });
        return include ? true : false;
    }

    private shouldCreateTableTypeForType(type: elements.Type): boolean {
        if (!this.tableTypeSelectors.length) {
            return false;
        }
        // Find the first selector that includes the type
        const include = this.tableTypeSelectors.find(p => {
            return p(type) === true
        });
        return include ? true : false;
    }
    //#endregion utility functions
}