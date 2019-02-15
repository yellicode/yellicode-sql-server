import * as elements from '@yellicode/elements';

export interface TypeAssociationInfo {    
    /**
     * The opposite type in the association.
     */
    fromType: elements.Type;    
    /**
     * The property that links the type to the opposite type.
     */
    fromProperty: elements.Property;
    /**
     * The type that is the subject (association end) of this association info.
     */
    toType: elements.Type;
    /**
     * The other end of the association. This value is null if the association info is derived from a 
     * attribute.
     */
    toProperty: elements.Property | null;
    /**
     * True if the property is owned by the type. If false, fromProperty is owned by the association
     */
    fromPropertyIsOwnedByType: boolean;
    /**
     * True if the opposite end allows multiple instances of type and the current end only allows one instance of the opposite type. 
     * E.g. when type is Employee and oppositeType is Department in a Department[1]-Employees[*] relationship, isOneToMany will be true
     * because the opposite end (Department) allows multiple instances of Employee. 
     */
    isOneToMany: boolean;
}

