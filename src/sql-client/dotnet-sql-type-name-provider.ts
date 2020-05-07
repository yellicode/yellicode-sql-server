import * as elements from '@yellicode/elements';
import * as dotnet from '@yellicode/dotnet-profile';
import { SqlServerTypeNameProvider } from '../sql-server';

/**
 * Maps types from the Yellicode .NET profile to SQL Server types.
 */
export class DotNetSqlTypeNameProvider extends SqlServerTypeNameProvider {
    private getDataTypeNameForDotNetType(type: elements.Type, isMultiValued: boolean) : string | null {
        if (dotnet.isBoolean(type)) {
            return 'bit';
        }
        else if (dotnet.isByte(type)) {
            // varbinary becomes varbinary(max) when using the DefaultSqlColumnSpecProvider
            return isMultiValued ? 'varbinary' : 'tinyint';
        }
        else if (dotnet.isInt16(type)) { // short
            return 'smallint';
        }
        else if (dotnet.isInt32(type)) {
            return 'int';
        }
        else if (dotnet.isInt64(type)) { // long
            return 'bigint';
        }
        else if (dotnet.isDecimal(type)) {
            return 'decimal'; // becomes decimal(18,2) when using the DefaultSqlColumnSpecProvider
        }
        else if (dotnet.isSingle(type)) { // float
            return 'real';
        }
        else if (dotnet.isDouble(type)) {
            return 'float';
        }
        else if (dotnet.isDateTime(type)) {
            return 'datetime2'
        }
        else if (dotnet.isString(type)) {
            return 'nvarchar';
        }
        else if (dotnet.isChar(type)) {
            return isMultiValued ? 'nvarchar' : 'nchar';
        }
        else if (dotnet.isSByte(type)) {
            return 'smallint';
        }
        else if (dotnet.isObject(type)) {
            return 'varbinary'; // well, you should probably override this to match your needs
        }
        return null;
    }

    protected getTypeNameForType(type: elements.Type | null, isDataType: boolean): string | null {
        if (type && isDataType) {
            var typeName = this.getDataTypeNameForDotNetType(type, false);
            if (typeName) return typeName;
        }
        return super.getTypeNameForType(type, isDataType);
    }

    protected /*override*/ getTypeNameForTypedElement(typedElement: elements.TypedElement, isDataType: boolean, isMultiValued: boolean): string | null {
        if (isDataType && typedElement.type) {
            const typeName = this.getDataTypeNameForDotNetType(typedElement.type!, isMultiValued);
            if (typeName) return typeName;
        }
        return super.getTypeNameForTypedElement(typedElement, isDataType, isMultiValued);
    }

    public static canBeNullable(type: elements.Type): boolean {
        if (!type || type.name == null)
            return false;

        if (elements.isPrimitiveString(type) || dotnet.isString(type) ||
            elements.isPrimitiveObject(type) || dotnet.isObject(type) ){
            return false; // type is already nullable
        }

        return elements.isEnumeration(type) || elements.isDataType(type); // isDataType includes PrimitiveType
    }

    /**
     * Returns true if variables and properties of the type can be assigned a null value,
     * even when not made nullable.
     */
    public static canHaveNullValue(type: elements.Type): boolean {
        if (!type || type.name == null)
            return false;

        if (elements.isPrimitiveString(type) || dotnet.isString(type) ||
            elements.isPrimitiveObject(type) || dotnet.isObject(type)
        ){
            return true;
        }

        // Is the type a complex type?
        return !elements.isDataType(type);
    }
}