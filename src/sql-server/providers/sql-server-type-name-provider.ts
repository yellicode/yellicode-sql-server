import * as elements from '@yellicode/elements';
import { AnsiSqlTypeNameProvider } from '../../relational/providers/ansi-sql-type-name-provider';
import { SqlUtility } from '../../relational/utils/sql-utility';

export class SqlServerTypeNameProvider extends AnsiSqlTypeNameProvider {
    constructor() {
        super();
    }

    protected getTypeNameForTypedElement(typedElement: elements.TypedElement, isDataType: boolean, isMultiValued: boolean): string | null {
        if (!typedElement.type)
            return 'int'; // ??

        return super.getTypeNameForTypedElement(typedElement, isDataType, isMultiValued);
    }

    protected getTypeNameForType(type: elements.Type | null, isDataType: boolean): string | null {
        if (!type) // handled in getTypeNameForTypedElement()
            return null;

        if (isDataType) {
            if (elements.isEnumeration(type)) {
                // For enums, either use 'int' or map the base type if it has one
                return type.baseType ? this.getTypeName(type.baseType) : 'int';
            }
            if (elements.isPrimitiveBoolean(type)) return 'bit';
            if (elements.isPrimitiveInteger(type)) return 'int';
            if (elements.isPrimitiveReal(type)) return 'real';
            if (elements.isPrimitiveString(type)) return 'nvarchar';
            if (elements.isPrimitiveObject(type)) return 'varbinary';
            return super.getDataTypeNameForType(type);
        }
        else {
            // The type is a complex type (FK). We should return the type of the identity of the principal entity.
            const idProperty = SqlUtility.findIdentityProperty(type);
            if (!idProperty) {
                throw `Unable to determine identity column name of type '${type}'. The type has no attribute with isID set to true.`
            }
            return this.getTypeName(idProperty);
        }
    }

}