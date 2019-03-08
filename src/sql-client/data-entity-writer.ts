import * as elements from '@yellicode/elements';
import { CSharpWriter } from "@yellicode/csharp";
import { DataAccessWriterBase } from "./data-access-writer-base";
import { MapperOptions } from "./options";

export class DataEntityWriter extends DataAccessWriterBase {
    constructor(writer: CSharpWriter, mapperOptions?: MapperOptions) {
        super(writer, mapperOptions || {});
    }

    // private writeForeignKeyProperty(property: elements.Property): void {
    //     // Get the foreign key type and name
    //     const identityProperty = SqlUtility.findIdentityProperty(property.type!);
    //     if (identityProperty && identityProperty.type) {
    //         const propertyName = this.getForeignKeyPropertyName(property);
    //         this.writer.writeLine(`public ${identityProperty.getTypeName()} ${propertyName} {get; set;}`)
    //         this.writer.writeLine();
    //     }
    // }

    public writeEntityClass(cls: elements.Class): void {
        this.writer.writeClassBlock(cls, () => {
            cls.ownedAttributes.forEach(property => {
                this.writer.writeAutoProperty(property);
                this.writer.writeLine();
               // if (this.isRelationship(property) && !this.options.noForeignKeyProperties && property.type) {

                // TODO: write FK property

                // if (this.isRelationship(property) && property.type) {
                //     this.writeForeignKeyProperty(property);
                // }
            });
        })
    }

    public writeEnumeration(enumeration: elements.Enumeration): void {
        this.writer.writeEnumeration(enumeration);
    }

    public writeType(entityType: elements.Type): void {
        if (elements.isClass(entityType)) {
            this.writeEntityClass(entityType);
        }
        else if (elements.isEnumeration(entityType)) {
            this.writeEnumeration(entityType);
        }
    }
}