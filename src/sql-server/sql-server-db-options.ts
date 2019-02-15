import * as elements from '@yellicode/elements';
import { DbOptions } from '../relational/db-options';
import { SqlServerObjectNameProvider } from './providers/sql-server-object-name-provider';
import { SqlServerColumnSpecProvider } from './providers/sql-server-column-spec-provider';

export interface SqlServerDbOptions extends DbOptions {
    /**
     * Set this value if you don't use the integer as identity type and 
     * use table valued parameters to pass a list of IDs.
     */
    identityType?: elements.Type;
    
    objectNameProvider?: SqlServerObjectNameProvider;

    /**
     * Provides column specifications, such as the column length, for a given property.
     */
    columnSpecProvider?: SqlServerColumnSpecProvider;
}
