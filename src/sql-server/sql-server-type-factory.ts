import * as elements from '@yellicode/elements';

/**
 * Temporary class to create a 'int' type for the default identity. This code should be replaced by a SQL Server
 * profile that includes all types.
 */
export class SqlServerTypeFactory {
    public static createInt(): elements.Type {
        return {
            name: 'int',
            elementType: elements.ElementType.primitiveType

        } as elements.Type;
    }
}