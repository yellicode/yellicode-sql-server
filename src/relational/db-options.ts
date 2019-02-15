import { TypeNameProvider } from '@yellicode/templating';
import { SqlObjectNameProvider } from './providers/sql-object-name-provider';
import { SqlColumnSpecProvider } from './providers/sql-column-spec-provider';

export interface DbOptions {
    /**
    * Sets an optional TypeNameProvider. By default, the SqlTypeNameProvider is used.
    */
    typeNameProvider?: TypeNameProvider;

    objectNameProvider?: SqlObjectNameProvider;

    /**
     * Provides column specifications, such as the column length, for a given property.
     */
    columnSpecProvider?: SqlColumnSpecProvider;
}
