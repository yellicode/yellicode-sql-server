import { TextWriter } from "@yellicode/templating";
import { SqlServerColumn, SqlServerTable } from '../model/sql-server-database';
import { SqlServerObjectNameProvider } from '../providers/sql-server-object-name-provider';
import { TSqlWriterBase } from './t-sql-writer-base';
import * as opts from '../options';

export class TSqlParameterWriter extends TSqlWriterBase {
    constructor(writer: TextWriter, private objectNameProvider: SqlServerObjectNameProvider) {
        super(writer);
    }

    private writeParameterInternal(
        parameterName: string,
        sqlTypeName: string,
        length: number | null,
        isNullable: boolean,
        isOutput: boolean,
        isMultiValued: boolean,
        isLast: boolean,
    ): void {

        this.writeIndent();
        this.write(`@${parameterName} ${sqlTypeName}`);
        if (length) {
            const lengthString = length === -1 ? 'max': length.toString();
            this.write(`(${lengthString})`);
        }
        if (isNullable && !isMultiValued) {
            this.write(' = NULL');
        }
        if (isOutput) {
            this.write(' OUTPUT');
        }
        if (isMultiValued) {
            this.write(' READONLY'); // The parameter is a user defined table type which requires READONLY
        }
        if (!isLast) this.write(',');
        this.writeEndOfLine();
    }

    public writeParameter(column: SqlServerColumn, isNullable: boolean, isOutput: boolean, isLast: boolean): void {
        //throw 'writeParameter is not implemented: todo: how to determine isMultivalued?';
        const parameterName = this.getParameterName(column);
        const isMultivalued = false; // TODO: TEMP!!
        this.writeParameterInternal(parameterName, column.sqlTypeName, column.length, isNullable, isOutput, isMultivalued, isLast);
    }

    public writeParameterList(table: SqlServerTable, options: opts.ParameterOptions, filter?: (value: SqlServerColumn) => boolean): void {

//         const includes = (options.includes === undefined) ? opts.ParameterIncludes.IdentityAndOther : options.includes;
//         const ownColumns = TSqlWriterBase.filterColumns(table.ownColumns, includes, filter);
//         const dependentColumns = TSqlWriterBase.filterColumns(table.dependentColumns, includes, filter);

//         ownColumns.forEach((p, index) => {
//             this.writeParameter(p,
//                 options.allowNulls || !p.isRequired,
//                 p.isIdentity && options.useIdentityAsOutput!,
//                 dependentColumns.length === 0 && index == ownColumns.length - 1);
//         });

//         dependentColumns.forEach((col, index) => {
            
//             const prop = col.sourceProperty!;
//             const isMany = col.isMany || false;// prop.isMultivalued();
//             const colName = this.objectNameProvider.getColumnName(prop);            
//             // Don't use this.getParameterName: it uses the full column name to make a.. ????
//             const paramName = this.getParameterName(col, isMany);
// //            const paramName = this.objectNameProvider.getParameterName(colName, isMultiValued);

// //  @CompanyIdTable IntTable READONLY, <!-- should be AddressIdTable or VisitAddressesIdTable when in the context of InsertCompany
// //	@CompanyId_VisitAddressesTable IntTable READONLY

//             const typeName = this.objectNameProvider.getParameterTypeName(col.typeName, isMany);            
//             this.writeParameterInternal(paramName, 
//                     typeName, 
//                     col.length, 
//                     true, // TODO: isNullable?
//                     false,
//                     prop.isMultivalued(), 
//                     index == dependentColumns.length - 1
//                 );
//             // this.writeParameter(p,
//             //     options.allowNulls || !p.isRequired,
//             //     p.isIdentity && options.useIdentityAsOutput!,
//             //     dependentColumns.length === 0 && index == ownColumns.length - 1);

//             // this.writeLine(`-- todo: Parameter for ${p.name} (${prop.name}): ${paramName}`);
//         });

    }
}