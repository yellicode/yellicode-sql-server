import * as elements from '@yellicode/elements';
import { CSharpWriter } from '@yellicode/csharp';
import { DataAccessCommandWriter } from "./data-access-command-writer";
import { MapperOptions } from "./options";
import { DataAccessWriterBase } from './data-access-writer-base';
import { SqlServerParameter, SqlServerStoredProcedure, QueryType, SqlParameterDirection } from '../sql-server';

interface CommandParameterInfo {
    dbParameter: SqlServerParameter;
    // propertyType: elements.Type,
    csharpTypeName: string;
    csharpName: string;
    isOutput: boolean;
    isInput: boolean;
    isMany: boolean;
}

/**
 * A wrapper around the DataAccessCommandWriter that writes CRUD data access methods.
 */
export class DataAccessMethodWriter extends DataAccessWriterBase {
    private commandWriter: DataAccessCommandWriter;

    constructor(writer: CSharpWriter, private connectionStringFieldName: string, mapperOptions?: MapperOptions) {
        super(writer, mapperOptions);

        this.commandWriter = new DataAccessCommandWriter(writer, 'command', mapperOptions);
    }

    public writeFromStoredProcedure(procedure: SqlServerStoredProcedure): void {
        const parameters: CommandParameterInfo[] = this.buildCommandParameters(procedure.parameters);
        const outputParameter = parameters.find(p => p.isOutput);
        const returnTypeName = DataAccessMethodWriter.getReturnTypeName(procedure, outputParameter);
        const methodName: string = this.objectNameProvider.getDataAccessMethodNameForStoredProcedure(procedure);

        this.writer.writeLine(`public ${returnTypeName} ${methodName}(`);
        this.writeMethodParameters(parameters);
        this.writer.writeLine(')');

        this.writer.writeCodeBlock(() => {
            if (procedure.queryType === QueryType.SelectSingle) {
                this.writer.writeLine(`${procedure.modelType!.name} entity;`);
            }
            else if (outputParameter) {
                this.writer.writeLine(`var ${outputParameter.csharpName} = default(${returnTypeName});`);
            }
            this.writer.writeLine(`using (SqlConnection connection = new SqlConnection(${this.connectionStringFieldName}))`);
            this.writer.writeCodeBlock(() => {
                this.writer.writeLine(`var command = new SqlCommand("${procedure.name}", connection) { CommandType = CommandType.StoredProcedure };`);
                this.writeAddCommandParameters(parameters);
                this.writer.writeLine('connection.Open();');
                // TODO: test for if (procedure.resultSets.count) instead                
                switch (procedure.queryType) {
                    case QueryType.SelectSingle:
                        this.writeExecuteReader(procedure.modelType!);
                        break;
                    default:
                        this.writeExecuteNonQuery(outputParameter);
                        break;
                }
                this.writer.writeLine('connection.Close();');
               
            });
            if (procedure.queryType === QueryType.SelectSingle) {
                this.writer.writeLine('return entity;');
            }
            else if (outputParameter) {
                this.writer.writeLine(`return ${outputParameter.csharpName};`);
            }
        });
    }    

    private static getReturnTypeName(procedure: SqlServerStoredProcedure, outputParameter?: CommandParameterInfo): string {
        if (procedure.queryType === QueryType.SelectSingle) {
           return procedure.modelType!.name;
        }
        else if (outputParameter) {     
            return outputParameter.csharpTypeName;
        }
        else return 'void';
    }

    private writeExecuteNonQuery(outputParameter?: CommandParameterInfo): void {
        if (outputParameter) {
            this.writer.writeLine('if (command.ExecuteNonQuery() > 0)');
            this.writer.writeCodeBlock(() => {
                const variableName = `${outputParameter.csharpName}Parameter`;
                this.writer.writeLine(`${outputParameter.csharpName} = Convert.To${outputParameter.csharpTypeName}(${variableName}.Value);`);
            })
        }
        else {
            this.writer.writeLine('command.ExecuteNonQuery();');
        }
    }

    private writeExecuteReader(sourceType: elements.Type): void {
        this.writer.writeLine('var reader = command.ExecuteReader();');
        this.writer.writeLine('if (reader.Read())');
        this.writer.writeCodeBlock(() => {
            this.writer.writeLine(`var mapper = new ${sourceType.name}DataRecordMapper(reader);`);
            this.writer.writeLine(`entity = mapper.MapDataRecord(reader);`);
        });
        this.writer.writeLine('else entity = null;');
    }

    private writeMethodParameters(parameters: CommandParameterInfo[]): void {
        const inputParameters = parameters.filter(p => p.isInput);
        this.writer.increaseIndent();
        inputParameters.forEach((p, index) => {         
            const csharpTypeName = p.isMany ? `IEnumerable<${p.csharpTypeName}>`: p.csharpTypeName;
            this.writer.writeIndent();
            this.writer.write(`${csharpTypeName} ${p.csharpName}`);
            if (index < inputParameters.length - 1) this.writer.write(', ');
            this.writer.writeEndOfLine();
        });
        this.writer.decreaseIndent();
    }

    private writeAddCommandParameters(parameters: CommandParameterInfo[]): void {
        parameters.forEach(p => {
            const dbParameter = p.dbParameter;
            const valueSelector = p.dbParameter.isNullable ? `${p.csharpName} ?? (object)DBNull.Value` : p.csharpName;
            if (p.isOutput) {
                // Make a SqlParameter that will contain the output                                
                const sqlDbType = 'Int'; // TODO: get the SqlDbType!
                const variableName = `${p.csharpName}Parameter`;
                this.writer.writeLine(`var ${variableName} = new SqlParameter("@${dbParameter.name}", SqlDbType.${sqlDbType}) {Direction = ParameterDirection.Output};`);
                this.writer.writeLine(`command.Parameters.Add(${variableName});`);
            }
            else {
                if (p.dbParameter.isTableValued){
                    const adapterName = `${p.csharpTypeName}TableAdapter`;
                    this.writer.writeLine(`command.Parameters.Add(${adapterName}.CreateAsDataParameter("@${dbParameter.name}", ${p.csharpName}));`);                    
                }
                else this.writer.writeLine(`command.Parameters.AddWithValue("@${dbParameter.name}", ${valueSelector});`);
            }
        });
    }

    private buildCommandParameters(parameters: SqlServerParameter[]): CommandParameterInfo[] {
        const result: CommandParameterInfo[] = [];
        parameters.forEach(p => {
            // const col = p.sourceColumn;
          //  const prop = p.s col.modelProperty;
            // if (!prop) {
            //     this.logger.warn(`No source property found for parameter '${p.name}' (column '${col})'.`);
            //     return;
            // }
            // if (!prop.type) {
            //     this.logger.warn(`Source property for parameter '${p.name}' (column '${col.name})' has no type.`);
            //     return;
            // }

            // If there is a model property, map the property name.
            // Otherwise (if the model is reverse engineered from SQL), map from the SQL parameter name
            let csharpName: string;
            if (p.objectProperty){
                csharpName = this.objectNameProvider.getMethodParameterName(p.objectProperty.name);
                // Pluralize if multi-valued
                if (p.isMultiValued) csharpName = `${csharpName}Collection`;
            }
            else csharpName = this.objectNameProvider.getMethodParameterName(p.name);         

            const info: CommandParameterInfo = {
                dbParameter: p,                
                csharpName: csharpName,
                csharpTypeName: p.objectTypeName,
                isInput: p.direction === SqlParameterDirection.Input || p.direction === SqlParameterDirection.InputOutput,
                isOutput: p.direction === SqlParameterDirection.Output || p.direction === SqlParameterDirection.InputOutput,
                isMany: p.isMultiValued || false
            }
            result.push(info);
        });
        return result;
    }
    // private writeMethodParametersFromEntity(parameterInfo: CommandParameterInfo[]): void {
    //     this.writer.increaseIndent();
    //     const inputParameters = parameterInfo.filter(p => !p.isOutput);
    //     inputParameters.forEach((p, index) => {
    //         this.writer.writeIndent();
    //         if (p.isForeignKey){
    //             if (p.generatedPropertyName) {
    //                 this.writer.write(`entity.${p.generatedPropertyName}`);                    
    //             }
    //             else {
    //                 // There is no generated FK property: get the id of the child entity
    //                 this.writer.write(`entity.${p.originalPropertyName}?.${p.correspondingProperty.name}`);
    //             } 
    //         }            
    //         else this.writer.write(`entity.${p.originalPropertyName}`);

    //         if (index < inputParameters.length - 1) this.writer.write(',');
    //         this.writer.writeEndOfLine();
    //     });
    //     this.writer.decreaseIndent();
    // }

    // private writeInsertEntityMethod(entityType: elements.Type, parameterInfo: CommandParameterInfo[], outputParameter: CommandParameterInfo): void {
    //     this.writer.writeLine(`public void Insert${entityType.name}(${entityType.name} entity)`);
    //     this.writer.writeCodeBlock(() => {
    //         this.writer.writeLine(`entity.${outputParameter.originalPropertyName} = Insert${entityType.name}(`);
    //         this.writeMethodParametersFromEntity(parameterInfo);
    //         this.writer.writeLine(');');             
    //     });
    // }

    // public writeInsertMethod(entityType: elements.Type, procedureName: string): void {
    //     const sqlParameterOptions: sqlOptions.ParameterOptions = { includes: sqlOptions.ParameterIncludes.IdentityAndOther, useIdentityAsOutput: true };
    //     const parameterInfo = this.commandWriter.getCommandParameterInfo(entityType, sqlParameterOptions);
    //     const outputParameter = null;//parameterInfo.find(p => p.isOutput);
    //     if (!outputParameter)
    //         return; // todo: log this

    //     const returnVariableName = outputParameter.methodParameterName;
    //     const returnTypeName = outputParameter.correspondingProperty.getTypeName();

    //     this.writer.writeLine(`public ${returnTypeName} Insert${entityType.name}(`);
    //     this.commandWriter.writeMethodParameterList(parameterInfo);
    //     this.writer.writeLine(')');

    //     this.writer.writeCodeBlock(() => {
    //         this.writer.writeLine(`var ${returnVariableName} = default(${returnTypeName});`);
    //         this.writer.writeLine(`using (SqlConnection connection = new SqlConnection(${this.connectionStringFieldName}))`);
    //         this.writer.writeCodeBlock(() => {
    //             this.writer.writeLine(`var command = new SqlCommand("${procedureName}", connection) { CommandType = CommandType.StoredProcedure };`);

    //             this.commandWriter.writeAddCommandParameterList(parameterInfo, false, { mapFromMethodParameters: true });               
    //             this.writer.writeLine('connection.Open();');                
    //             this.writer.writeLine('if (command.ExecuteNonQuery() > 0)');
    //             this.writer.writeCodeBlock(() => {
    //                 this.writer.writeLine(`${returnVariableName} = Convert.To${returnTypeName}(${outputParameter.variableName}.Value);`);
    //             })
    //             this.writer.writeLine('connection.Close();');                
    //         });
    //         this.writer.writeLine(`return ${returnVariableName};`);                            
    //     });

    //     // Write an overload that accepts the entity as argument
    //     this.writer.writeLine();
    //     this.writeInsertEntityMethod(entityType, parameterInfo, outputParameter);
    // }

    // private writeUpdateEntityMethod(entityType: elements.Type, parameterInfo: CommandParameterInfo[]): void {
    //     this.writer.writeLine(`public void Update${entityType.name}(${entityType.name} entity)`);
    //     this.writer.writeCodeBlock(() => {
    //         this.writer.writeLine(`Update${entityType.name}(`);
    //         this.writeMethodParametersFromEntity(parameterInfo);
    //         this.writer.writeLine(');');
    //     });
    // }

    // public writeUpdateMethod(entityType: elements.Type, procedureName: string): void {
    //     const sqlParameterOptions: sqlOptions.ParameterOptions = { includes: sqlOptions.ParameterIncludes.IdentityAndOther };
    //     const parameterInfo = this.commandWriter.getCommandParameterInfo(entityType, sqlParameterOptions);

    //     this.writer.writeLine(`public void Update${entityType.name}(`);
    //     this.commandWriter.writeMethodParameterList(parameterInfo);
    //     this.writer.writeLine(')');

    //     this.writer.writeCodeBlock(() => {
    //         this.writer.writeLine(`using (SqlConnection connection = new SqlConnection(${this.connectionStringFieldName}))`);
    //         this.writer.writeCodeBlock(() => {
    //             this.writer.writeLine(`var command = new SqlCommand("${procedureName}", connection) { CommandType = CommandType.StoredProcedure };`);
    //             this.commandWriter.writeAddCommandParameterList(parameterInfo, false, { mapFromMethodParameters: true });
    //             this.writer.writeLine('connection.Open();');
    //             this.writer.writeLine('command.ExecuteNonQuery();');
    //             this.writer.writeLine('connection.Close();');
    //         });
    //     });

    //     this.writer.writeLine();
    //     this.writeUpdateEntityMethod(entityType, parameterInfo);
    // }

    // public writeDeleteByIdMethod(entityType: elements.Type, procedureName: string): void {
    //     const sqlParameterOptions: sqlOptions.ParameterOptions = { includes: sqlOptions.ParameterIncludes.Identity };
    //     const parameterInfo = this.commandWriter.getCommandParameterInfo(entityType, sqlParameterOptions);

    //     this.writer.writeLine(`public void Delete${entityType.name}ById(`);
    //     this.commandWriter.writeMethodParameterList(parameterInfo);
    //     this.writer.writeLine(')');
    //     this.writer.writeCodeBlock(() => {
    //         this.writer.writeLine(`using (SqlConnection connection = new SqlConnection(${this.connectionStringFieldName}))`);
    //         this.writer.writeCodeBlock(() => {
    //             this.writer.writeLine(`var command = new SqlCommand("${procedureName}", connection) { CommandType = CommandType.StoredProcedure };`);
    //             this.commandWriter.writeAddCommandParameterList(parameterInfo, false, { mapFromMethodParameters: true });
    //             this.writer.writeLine('connection.Open();');
    //             this.writer.writeLine('command.ExecuteNonQuery();');
    //             this.writer.writeLine('connection.Close();');
    //         });
    //     });
    // }

    // public writeSelectByIdMethod(entityType: elements.Type, procedureName: string): void {
    //     const sqlParameterOptions: sqlOptions.ParameterOptions = { includes: sqlOptions.ParameterIncludes.Identity };
    //     const parameterInfo = this.commandWriter.getCommandParameterInfo(entityType, sqlParameterOptions);

    //     this.writer.writeLine(`public ${entityType.name} Select${entityType.name}ById(`);
    //     this.commandWriter.writeMethodParameterList(parameterInfo);
    //     this.writer.writeLine(')');
    //     this.writer.writeCodeBlock(() => {
    //         this.writer.writeLine(`using (SqlConnection connection = new SqlConnection(${this.connectionStringFieldName}))`);
    //         this.writer.writeCodeBlock(() => {
    //             this.writer.writeLine(`var command = new SqlCommand("${procedureName}", connection) { CommandType = CommandType.StoredProcedure };`);
    //             this.commandWriter.writeAddCommandParameterList(parameterInfo, false, { mapFromMethodParameters: true });
    //             this.writer.writeLine('connection.Open();');

    //             this.writer.writeLine(`${entityType.name} entity;`);
    //             this.writer.writeLine('var reader = command.ExecuteReader();');
    //             this.writer.writeLine('if (reader.Read())');
    //             this.writer.writeCodeBlock(() => {
    //                 this.writer.writeLine(`var mapper = new ${entityType.name}DataRecordMapper(reader);`);
    //                 this.writer.writeLine(`entity = mapper.MapDataRecord(reader);`);
    //             });
    //             this.writer.writeLine('else entity = null;');
    //             this.writer.writeLine('connection.Close();');
    //             this.writer.writeLine('return entity;');
    //         });
    //     });
    // }
}