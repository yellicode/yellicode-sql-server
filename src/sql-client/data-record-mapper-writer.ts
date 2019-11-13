import { CSharpWriter } from "@yellicode/csharp";
import * as elements from '@yellicode/elements';
import { NameUtility } from '@yellicode/core';
import { DataAccessWriterBase } from './data-access-writer-base';
import { DataRecordMethodMapper } from './data-record-method-mapper';
import { DataRecordSpecification } from './data-record-specification';
import { DotNetDataRecordMethodMapper } from './dotnet-datarecord-mapper';
import { MapperOptions } from './options';
import { SqlUtility } from '../sql-server';

/**
 * Generates a mapper classes that create and fill entities from System.Data.IDataRecord instances 
 * (provided by the System.Data.IDataReader).
 */
export class DataRecordMapperWriter extends DataAccessWriterBase {
 //   private sqlSelectSpecificationBuilder: SqlSelectSpecificationBuilder;
    private dataRecordMethodMapper: DataRecordMethodMapper;

    constructor(writer: CSharpWriter, mapperOptions?: MapperOptions) {        
        super(writer, mapperOptions);
    
    //    this.sqlSelectSpecificationBuilder = new SqlSelectSpecificationBuilder(this.sqlObjectNameProvider, this.sqlColumnSpecProvider);
        this.dataRecordMethodMapper = new DotNetDataRecordMethodMapper(); // todo: should we make this extensible?
    }

    private getDataRecordSpecifications(type: elements.Type): DataRecordSpecification[] {
       // const sqlSelectSpecifications = this.sqlSelectSpecificationBuilder.build(type);
        const recordSpecifications: DataRecordSpecification[] = [];
        throw 'This is not implemented';
        // sqlSelectSpecifications.forEach(spec => {
        //     recordSpecifications.push({
        //         isJoined: spec.isJoined,
        //         isForeignKey: spec.isForeignKey,
        //         property: spec.property,
        //         parentProperty: spec.parentProperty,
        //         uniqueName: `${spec.entityType.name}${spec.property.name}`,
        //         sqlName: spec.alias || spec.columnName
        //     });
        // });
        // return recordSpecifications;
    }

    private static writeIndexFields(writer: CSharpWriter, specifications: DataRecordSpecification[]): void {
        specifications.forEach(spec => {
            const fieldName = DataRecordMapperWriter.getIndexFieldName(spec);
            writer.writeLine(`private readonly int ${fieldName};`);
        });
    }

    private static writeConstructor(writer: CSharpWriter, entityType: elements.Type, specifications: DataRecordSpecification[]): void {
        writer.writeLine(`public ${entityType.name}DataRecordMapper(IDataReader dataReader)`);
        writer.writeCodeBlock(() => {
            writer.writeLine('if (dataReader == null) throw new ArgumentNullException(nameof(dataReader));');
            writer.writeLine();
            specifications.forEach(spec => {
                const fieldName = DataRecordMapperWriter.getIndexFieldName(spec);
                writer.writeLine(`${fieldName} = dataReader.GetOrdinal("${spec.sqlName}");`);
            });
        });
    }

    private writeComplexTypeInitialization(specifications: DataRecordSpecification[]): void {
        const filteredRecords = specifications.filter(spec => spec.isForeignKey);
        if (filteredRecords.length === 0) return;

        this.writer.writeLine();
        
        filteredRecords.forEach(spec => {
            // There must be an identity on the other side  
            const principalIdProperty = SqlUtility.findIdentityProperty(spec.property.type!);
            const propertyTypeName = spec.property.getTypeName();
            if (!principalIdProperty) {
                this.writer.writeLine(`// Warning: type ${propertyTypeName} has no attribute with isID set to true. Cannot create a valid ${propertyTypeName} instance.`)
                return;
            }

            const dataRecordMethodName = this.getDataRecordGetValueMethod(principalIdProperty);
            const foreignKeyPropertyName = '';// this.getForeignKeyPropertyName(spec.property);
            const idVariableName = NameUtility.upperToLowerCamelCase(foreignKeyPropertyName);
            const indexFieldName = DataRecordMapperWriter.getIndexFieldName(spec);
            
            this.writer.writeLine(`if (!dataRecord.IsDBNull(${indexFieldName}))`);
            this.writer.writeCodeBlock(() => {
                this.writer.writeLine(`var ${idVariableName} = dataRecord.${dataRecordMethodName}(${indexFieldName});`);
             //   if (!this.options.noForeignKeyProperties){
                    this.writer.writeLine(`entity.${foreignKeyPropertyName} = ${idVariableName};`);
              //  }
                this.writer.writeLine(`entity.${spec.property.name} = new ${propertyTypeName}() { ${principalIdProperty.name} = ${idVariableName} };`);
            })
        });
    }

    private writeMapDataRecordMethod(entityType: elements.Type, specifications: DataRecordSpecification[]): void {
        this.writer.writeLine(`public ${entityType.name} MapDataRecord(IDataRecord dataRecord)`);
        this.writer.writeCodeBlock(() => {
            this.writer.writeLine(`var entity = new ${entityType.name}();`);
            // Initialize complex properties first            
            this.writeComplexTypeInitialization(specifications);
            this.writer.writeLine();
            specifications.forEach(spec => {
                if (spec.isForeignKey || !spec.property.type)
                    return;

                const fieldName = DataRecordMapperWriter.getIndexFieldName(spec);
                const property = spec.property;
                const isComplexType = !elements.isDataType(spec.property.type);
                const dataRecordMethodName = this.getDataRecordGetValueMethod(spec.property);

                if (spec.parentProperty) {
                    this.writer.writeLine(`if (!dataRecord.IsDBNull(${fieldName}) && entity.${spec.parentProperty.name} != null)`);
                }
                else this.writer.writeLine(`if (!dataRecord.IsDBNull(${fieldName}))`);
                this.writer.increaseIndent();
                this.writer.writeIndent();
                this.writer.write(` entity`);
                if (spec.parentProperty) {
                    this.writer.write(`.${spec.parentProperty.name}`);
                }
                this.writer.write(`.${property.name} = `);
                if (elements.isEnumeration(spec.property.type)) {
                    // If the type is an enum, the type is Int32 which we should cast to an enum   
                    this.writer.write(`(${spec.property.getTypeName()})`);
                }
                this.writer.write(`dataRecord.${dataRecordMethodName}(${fieldName});`);
                this.writer.writeEndOfLine();
                this.writer.decreaseIndent();
            });
            this.writer.writeLine();
            this.writer.writeLine(`return entity;`);
        });
    }

    public writeMapperClass(entityType: elements.Class) {
        const recordSpecifications = this.getDataRecordSpecifications(entityType);

        this.writer.writeLine(`internal partial class ${entityType.name}DataRecordMapper`);
        this.writer.writeCodeBlock(() => {
            // Private fields                        
            DataRecordMapperWriter.writeIndexFields(this.writer, recordSpecifications);
            // Constructor()
            this.writer.writeLine();
            DataRecordMapperWriter.writeConstructor(this.writer, entityType, recordSpecifications);
            // MapDataRecord
            this.writer.writeLine();
            this.writeMapDataRecordMethod(entityType, recordSpecifications);
        });
    }

    private getDataRecordGetValueMethod(typedElement: elements.TypedElement): string | null {
        return this.dataRecordMethodMapper.getDataRecordGetValueMethod(typedElement);
    }

    //#region utility functions    
    private static getIndexFieldName(specification: DataRecordSpecification): string {
        return `_${NameUtility.upperToLowerCamelCase(specification.uniqueName)}Index`;
    }
    //#endregion utility functions    
}