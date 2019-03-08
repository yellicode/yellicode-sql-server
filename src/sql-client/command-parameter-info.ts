import { Type, Property } from "@yellicode/elements";

export interface CommandParameterInfo {
    sqlParameterName: string;
    methodParameterName: string;    
    /**
     * The corresponding property. In case of a foreign key relationship, this property
     * refers to the identity of the primary key entity.
     */
    correspondingProperty: Property;
    /**
     * The generated property name in case the property is a foreign key relationship 
     * for which a corresponding foreign key property is generated.
     */
    generatedPropertyName: string | null;
    originalPropertyName: string;
    isForeignKey: boolean;
    /**
     * True if the corresponding property is optional or if the options 
     * allow for null values (only with select queries).
     */
    allowNull: boolean;
    isOutput: boolean;
    variableName: string;
}