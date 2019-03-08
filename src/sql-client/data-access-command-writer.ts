import { CSharpWriter } from '@yellicode/csharp';
import * as elements from '@yellicode/elements';
import { CommandParameterInfo } from './command-parameter-info';
import { DataAccessWriterBase } from './data-access-writer-base';
import { DotNetSqlTypeNameProvider } from './dotnet-sql-type-name-provider';
import * as mapperOptions from './options';

export class DataAccessCommandWriter extends DataAccessWriterBase {

    private commandVariableName: string;

    constructor(writer: CSharpWriter, commandVariableName?: string, options?: mapperOptions.MapperOptions) {
        super(writer, options);

        this.commandVariableName = commandVariableName || 'command';
    }

    private writeAddCommandParameter(info: CommandParameterInfo, parameterOptions: mapperOptions.ParameterOptions): void {
        if (!info.correspondingProperty.type)
            return;

        let valueSelector: string = parameterOptions.mapFromMethodParameters ?
            info.methodParameterName : `entity.${info.generatedPropertyName}`;

        if (info.allowNull || DotNetSqlTypeNameProvider.canHaveNullValue(info.correspondingProperty.type)) {
            valueSelector = `${valueSelector} ?? (object)DBNull.Value`;
        }
        if (info.isOutput){
            // TODO: get the SqlDbType            
            this.writer.writeLine(`var ${info.variableName} = new SqlParameter("@${info.sqlParameterName}", SqlDbType.Int) {Direction = ParameterDirection.Output};`);
            this.writer.writeLine(`command.Parameters.Add(${info.variableName});`);
        }
        else this.writer.writeLine(`${this.commandVariableName}.Parameters.AddWithValue("@${info.sqlParameterName}", ${valueSelector});`);        
    }

    // public writeAddIdentityCommandParameter(type: model.Type, variableName: string): model.Property | null {
    //     const idProperty = SqlUtility.findIdentityProperty(type);
    //     if (!idProperty) return null;

    //     var paramName = this.getSqlParameterName(idProperty);
        
    //     return idProperty;
    // }

    private writeMethodParameter(info: CommandParameterInfo, isLast: boolean) {
        if (!info.correspondingProperty.type)
            return;

        const isNullable = info.allowNull && DotNetSqlTypeNameProvider.canBeNullable(info.correspondingProperty.type);
        const typeName = info.correspondingProperty.getTypeName();

        this.writer.writeIndent();
        this.writer.write(`${typeName}`);
        if (isNullable) {
            this.writer.write('?');
        }
        this.writer.write(` ${info.methodParameterName}`);
        if (isLast === false) this.writer.write(', ');
        this.writer.writeEndOfLine();
    }

    // public getCommandParameterInfo(type: elements.Type,
    //     sqlParameterOptions: sqlOptions.ParameterOptions,
    //     allowNulls?: boolean,
    //     filterCallback?: (value: elements.Property) => boolean): CommandParameterInfo[] {

    //     const result: CommandParameterInfo[] = [];

    //     if (!elements.isMemberedClassifier(type)) return []; // type has no ownedAttributes         

    //     const includes = (sqlParameterOptions.includes === undefined) ? sqlOptions.ParameterIncludes.IdentityAndOther : sqlParameterOptions.includes;
    //     const properties = SqlUtility.filterParameterProperties(type.ownedAttributes, includes, filterCallback);

    //     properties.forEach(p => {
    //         if (!p.type) return;

    //         let originalPropertyName = p.name;
    //         let generatedPropertyName = null;
    //         let property = p;
    //         const isForeignKey = this.sqlColumnSpecProvider.isRelationship(p);

    //         if (isForeignKey) {
    //             property = SqlUtility.findIdentityProperty(p.type)!;
    //             if (!this.options.noForeignKeyProperties) {
    //                 generatedPropertyName = this.getForeignKeyPropertyName(p);
    //             }
    //         }
            
    //         result.push({
    //             originalPropertyName: originalPropertyName,
    //             generatedPropertyName: generatedPropertyName,
    //             correspondingProperty: property,
    //             isForeignKey: isForeignKey,
    //             isOutput: p.isID && sqlParameterOptions.useIdentityAsOutput!,
    //             allowNull: allowNulls || p.isOptional(),
    //             methodParameterName: this.getMethodParameterName(property.name),
    //             variableName: NameUtility.upperToLowerCamelCase(property.name) + 'Parameter',
    //             sqlParameterName: this.getSqlParameterName(p)
    //         })
    //     });

    //     return result;
    // }

    public writeAddCommandParameterList(
        parameters: CommandParameterInfo[],
        allowNulls?: boolean,
        mapperParameterOptions?: mapperOptions.ParameterOptions,
        filterCallback?: (value: elements.Property) => boolean): void {

        if (!mapperParameterOptions) mapperParameterOptions = {};

        parameters.forEach((p, index) => {
            this.writeAddCommandParameter(p, mapperParameterOptions!);
        });
    }


    public writeMethodParameterList(parameters: CommandParameterInfo[]): void {
        this.writer.increaseIndent();
        parameters.forEach((p, index) => {
            if (!p.isOutput) {
                this.writeMethodParameter(p, index == parameters.length - 1);
            }
        });
        this.writer.decreaseIndent();
    }
}