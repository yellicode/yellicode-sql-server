import * as elements from '@yellicode/elements';
import { DefaultSqlColumnSpecProvider, SqlColumnSpecProvider } from '../../relational/providers/sql-column-spec-provider';

export interface SqlServerColumnSpecProvider extends SqlColumnSpecProvider {
    /**
     * Returns true if, when creating a table type matching the specified type, 
     * the table type should be a single-column table with the column's type matching
     * the specified type. Returns false if a complex table type should be created
     * with a column for each property. By default, this function returns true for all
     * data types.
     * @param type The type for which the table type is created.
     */
    requiresSimpleTableType(type: elements.Type): boolean;
}

export class DefaultSqlServerColumnSpecProvider extends DefaultSqlColumnSpecProvider {
    public /*virtual */ getLength(sqlTypeName: string, property?: elements.Property): string | null {
        if (!this.requiresLength(sqlTypeName, property)) {
            return null;
        }
        const isSingleValued = property && !property.isMultivalued();
        // Return a length of 1 for the single-valued none-var... types.
        if (isSingleValued && (sqlTypeName === 'char' || sqlTypeName === 'binary' || sqlTypeName === 'nchar')){
            return '1';
        }
        return 'max';
    }

    protected  /*override */ requiresLength(sqlTypeName: string, property?: elements.Property): boolean {
        switch (sqlTypeName) {
            case 'binary':
            case 'varbinary':
            case 'char':
            case 'nchar':
            case 'varchar':
            case 'nvarchar':
                return true;
            default: return false;
        }
    }

    public /*virtual */ getPrecision(sqlTypeName: string, property?: elements.Property): number | null {
        switch (sqlTypeName) {
            case 'decimal':
                return 18;
            default:
                return null;
        }
    }

    public /*virtual */ getScale(sqlTypeName: string, property?: elements.Property): number | null {        
        switch (sqlTypeName) {
            case 'decimal':
                return 2;
            default:
                return null;
        }
    }   

    public  /*virtual */ requiresSimpleTableType(type: elements.Type): boolean {        
        return elements.isDataType(type);
    }
}