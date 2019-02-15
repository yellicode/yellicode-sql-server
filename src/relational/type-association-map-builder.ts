import * as elements from '@yellicode/elements';
import { SqlColumnSpecProvider } from './providers/sql-column-spec-provider';
import { TypeAssociationInfo } from './model/type-association-info';

export class TypeAssociationMapBuilder {
    private map: Map<elements.Type, TypeAssociationInfo[]>;

    constructor(private columnSpecProvider: SqlColumnSpecProvider) {
        this.map = new Map<elements.Type, TypeAssociationInfo[]>();        
    }

    public getMap(): Map<elements.Type, TypeAssociationInfo[]> {
        return this.map;
    }
    
    private static buildFromAssociationEnds(type: elements.Type, toEnd: elements.Property, fromEnd: elements.Property): TypeAssociationInfo {        
        const isOneToMany = (!toEnd.isMultivalued() && fromEnd.isMultivalued());
        const fromType = toEnd.type!;        

        return { fromType: fromType, fromProperty: fromEnd, toType: type, toProperty: toEnd, fromPropertyIsOwnedByType: toEnd.owner === type, isOneToMany: isOneToMany };        
    }

    private static buildFromAttribute(owningType: elements.Type, property: elements.Property): TypeAssociationInfo {
        const propertyType = property.type!;        
        const isOneToMany = property.isMultivalued();
        // TODO: make isManyToMany if aggregation is set to Shared!?
        // console.log(`Creating type assocation from ${type.name} to ${owningType.name} (1-to-many: ${isOneToMany}). Property: ${property.name}`);
        
        // fromPropertyIsOwnedByType is false because type is the type of te property, not the owningType!
        return {fromType: owningType, fromProperty: property, toType: propertyType, toProperty: null, fromPropertyIsOwnedByType: false, isOneToMany: isOneToMany };        
    }

    private addAssociationInfo(info: TypeAssociationInfo): void {
        let infoByType = this.map.get(info.toType) || [];
        infoByType.push(info);
        this.map.set(info.toType, infoByType);
    }

    public addAssociations(associations: elements.Association[]): TypeAssociationMapBuilder {        
        associations.forEach(a => {
            if (a.memberEnds.length !== 2)
                return; // the association is not binary

            // Get both types in the association
            const memberEnd1 = a.memberEnds[0];
            const memberEnd2 = a.memberEnds[1];

            // The following looks confusing but, in an association, the type of an end (a Property) is the opposite type.
            const end1 = memberEnd2.type!; 
            const end2 = memberEnd1.type!;

            const member1Info = TypeAssociationMapBuilder.buildFromAssociationEnds(end1, memberEnd1, memberEnd2);
            const member2Info = TypeAssociationMapBuilder.buildFromAssociationEnds(end2, memberEnd2, memberEnd1);

            this.addAssociationInfo(member1Info);           
            this.addAssociationInfo(member2Info);            
        });
        return this;
    }

    public addNonAssociationRelations(pack: elements.Package): TypeAssociationMapBuilder {
        pack.getAllTypes().forEach(t => {
            if (!elements.isMemberedClassifier(t)) return;
            // Get all FK attributes (all complex types)            
            t.ownedAttributes.forEach(att => {
                if (this.columnSpecProvider.isRelationship(att)) {                    
                    // Is the attribute an association member? If so, it will be handled by addAssociations.
                    if (att.association) 
                        return;

                    const memberInfo = TypeAssociationMapBuilder.buildFromAttribute(t, att);                                       
                    this.addAssociationInfo(memberInfo);
                }
            });
        });
        return this;
    }
}