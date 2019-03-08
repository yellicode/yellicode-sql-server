import * as elements from '@yellicode/elements';

export interface DataRecordSpecification {
    // propertyName: string;
    uniqueName: string;    
    sqlName: string;
    property: elements.Property; 
    isJoined: boolean;
    isForeignKey: boolean;    
    /**
     * The parent property of property: for example when the path is Employee.Department.Name,
     * property is Name and Department is the parent property.
     */
    parentProperty: elements.Property | null;    
}
