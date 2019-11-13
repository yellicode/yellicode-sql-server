import * as elements from '@yellicode/elements';
import { DefaultTypeNameProvider } from "@yellicode/elements";
import { SqlUtility } from '../utils/sql-utility';

export class AnsiSqlTypeNameProvider extends DefaultTypeNameProvider {

    protected getTypeNameForTypedElement(typedElement: elements.TypedElement, isDataType: boolean, isMultiValued: boolean): string | null {
        if (!typedElement.type)
            throw `Unable to provide a type name for '${typedElement.name}' because it has no type.`;

        return super.getTypeNameForTypedElement(typedElement, isDataType, isMultiValued);
    }

    protected /*override*/ getTypeNameForType(type: elements.Type | null, isDataType: boolean): string | null {
        if (!type) // handled in getTypeNameForTypedElement
            return null;

        // TODO: implement this with ANSI types
        // http://www-db.deis.unibo.it/courses/TW/DOCS/w3schools/sql/sql_datatypes_general.asp.html

        if (isDataType) {
            // TODO: implement this with ANSI types!
            return super.getTypeNameForType(type, isDataType);
        }
        
        // The type is a complex type (FK). We should return the type of the identity of the principal entity.
        const idProperty = SqlUtility.findIdentityProperty(type);
        if (!idProperty) {
            throw `Unable to determine identity column name of type '${type}'. The type has no attribute with isID set to true.`
        }
        return this.getTypeName(idProperty);
    }
}