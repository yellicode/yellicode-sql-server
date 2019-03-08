import * as elements from '@yellicode/elements';

export interface DataRecordMethodMapper {
    getDataRecordGetValueMethodForType(t: elements.Type, isMultiValued?: boolean): string | null;
    getDataRecordGetValueMethod(typedElement: elements.TypedElement): string | null;
}

export class BasicDataRecordMethodMapper implements DataRecordMethodMapper {
    public /*override*/ getDataRecordGetValueMethodForType(t: elements.Type, isMultiValued?: boolean): string | null {        
        if (elements.isEnumeration(t)){
            return 'GetInt32';
        }
        if (elements.isPrimitiveBoolean(t)) {
            return 'GetBoolean';
        }
        else if (elements.isPrimitiveInteger(t)) {
            return 'GetInt32';
        }
        else if (elements.isPrimitiveReal(t)) { // float
            return 'GetFloat';
        }
        else if (elements.isPrimitiveString(t)) {
            return 'GetString';
        }
        return null;
    }

    public getDataRecordGetValueMethod(typedElement: elements.TypedElement): string | null {
        if (!typedElement.type) 
            return null;

        const isMultiValued = elements.isMultiplicityElement(typedElement) && typedElement.isMultivalued();
        return this.getDataRecordGetValueMethodForType(typedElement.type!, isMultiValued);
    }
}