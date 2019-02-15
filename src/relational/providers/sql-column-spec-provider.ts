import * as elements from '@yellicode/elements';

export interface SqlColumnSpecProvider {
    getLength(sqlTypeName: string, property?: elements.Property): string | null;   
    getPrecision(sqlTypeName: string, property?: elements.Property): number | null;
    getScale(sqlTypeName: string, property?: elements.Property): number | null;
    isRelationship(property: elements.Property): boolean;    
}

export class DefaultSqlColumnSpecProvider implements SqlColumnSpecProvider {
    public /*virtual */ getLength(sqlTypeName: string, property?: elements.Property): string | null {
       return null;
    }

    protected  /*virtual */ requiresLength(sqlTypeName: string, property?: elements.Property): boolean {
        return false;
        
    }

    public /*virtual */ getPrecision(sqlTypeName: string, property?: elements.Property): number | null {
        return null;
     
    }

    public /*virtual */ getScale(sqlTypeName: string, property?: elements.Property): number | null {
        return null;      
    }

    public /*virtual */ isRelationship(property: elements.Property): boolean {
        return !elements.isDataType(property.type);
    }
}