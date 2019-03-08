import { MapperOptions } from "./options";
import { DefaultDotNetObjectNameProvider } from "./dotnet-object-name-provider";
import { ConsoleLogger, LogLevel } from '@yellicode/core';

export class MapperOptionsBuilder {
    public static buildAll(opts?: MapperOptions): MapperOptions {
        if (!opts) opts = {};

        // Ensure complete sqlWriterOptions          
       // opts.sqlWriterOptions = SqlWriterOptionsBuilder.buildAll(opts.sqlWriterOptions);;
        if (!opts.objectNameProvider) opts.objectNameProvider = new DefaultDotNetObjectNameProvider();
        if (!opts.logger) opts.logger = new ConsoleLogger(console, LogLevel.Info);
        return opts;
    }
}