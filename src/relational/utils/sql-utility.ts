import * as elements from '@yellicode/elements';

export class SqlUtility {
    /**
     * Finds the first property that has isID set to true.     
     */
    public static findIdentityProperty(type: elements.Type) : elements.Property | null {
        if (!elements.isMemberedClassifier(type)){
            return null;
        }
        return type.ownedAttributes.find(att => att.isID) || null;
    }   
  
    public static resolveAssociationEnds(association: elements.Association, entityType: elements.Type): { entityEnd: elements.Property, oppositeEnd: elements.Property } | null {
        if (association.memberEnds.length !== 2) {
            return null; // The association is not binary
        }
        const oppositeEndIndex = association.memberEnds.findIndex(end => end.type === entityType);
        if (oppositeEndIndex < 0) return null;// entityType is not a member of the association  

        const entityEndIndex = oppositeEndIndex === 0 ? 1 : 0;
        return { entityEnd: association.memberEnds[entityEndIndex], oppositeEnd: association.memberEnds[oppositeEndIndex] };
    }
}