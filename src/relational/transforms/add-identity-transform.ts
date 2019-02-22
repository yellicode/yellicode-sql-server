import * as elements from "@yellicode/elements";
import { PackagedElementTransform } from '@yellicode/templating';

export interface AddIdentityTransformOptions {
    /**
     * An optional callback function that returns a name for each created identity property.
     * If not provided, the created property will be named "Id".
     */
    createNameCallback?: (entityType: elements.Type) => string;
    /**
     * An optional callback function that returns a documentation comment for each created identity property.
     * If not provided, the property will have no documentation.
     */
    createCommentCallback?: (entityType: elements.Type) => string;    
}

/**
 * Adds an identity property to each entity to which it is applied, with a property type specified in the constructor. 
 * By default, the identity property will be named "Id", unless specified otherwise in the constructor.
 */
export class AddIdentityTransform extends PackagedElementTransform {
    private options: AddIdentityTransformOptions;

    /**
    * Constructor, creates a new AddIdentityTransform instance that uses the specified type as identity type.
    * 
    * @param identityType The type of the identity property to create.
    * @param createNameCallback 
    */
    constructor(private identityType: elements.Type, options?: AddIdentityTransformOptions) {
        super();
        this.options = options || {};
    }

    protected transformElement(element: elements.PackageableElement): void {
        if (!elements.isMemberedClassifier(element))
            return;

        const attribute: elements.Property = elements.ElementFactory.createProperty(element);
        const name = this.options.createNameCallback ? this.options.createNameCallback(element) : "Id";        
        attribute.name = name;
        attribute.type = this.identityType;
        attribute.visibility = elements.VisibilityKind.public;
        attribute.isID = true;

        if (this.options.createCommentCallback){            
            const comment = this.options.createCommentCallback(element);
            attribute.ownedComments.push(elements.ElementFactory.createComment(attribute, comment));
         }

        element.ownedAttributes.unshift(attribute);
    }
}