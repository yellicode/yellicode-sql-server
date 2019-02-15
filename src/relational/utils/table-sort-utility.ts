import { Table } from '../model/database';
const toposort = require('toposort'); 

export class TableSortUtility {
    /**
     * Sorts the tables so that dependent tables come after their dependencies.      
     */
    public static sortByDependency(tables: Table[]): Table[] {
        var graph: Table[][] = [];
        tables.forEach(t => {
            // Get the tables that depend on this table
            const deps = TableSortUtility.getTableDepents(t);
            //   console.log(`Table ${t.name} has dependents ${deps.map(d => d.name).join(', ')}`);
            deps.forEach(d => {
                graph.push([t, d]);
            });
        });

        return toposort.array(tables, graph);
    }

    private static getTableDepents(table: Table): Table[] {
        const result: Table[] = [];
        table.dependentColumns.forEach(c => {
            if ((c.table != table) && result.indexOf(c.table) === -1) {
                result.push(c.table);
            }
        });
        return result;
    }
}