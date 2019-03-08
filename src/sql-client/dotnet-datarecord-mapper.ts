import * as elements from '@yellicode/elements';
import * as dotnet from '@yellicode/dotnet-profile';
import { BasicDataRecordMethodMapper } from './data-record-method-mapper';

export class DotNetDataRecordMethodMapper extends BasicDataRecordMethodMapper {
    public /*override*/ getDataRecordGetValueMethodForType(t: elements.Type, isMultiValued?: boolean): string | null {                
        if (dotnet.isBoolean(t)) {
            return 'GetBoolean';
        }
        else if (dotnet.isByte(t)) {
            return isMultiValued ? 'GetBytes' : 'GetByte';
        }
        else if (dotnet.isInt16(t)) { // short
            return 'GetInt16';
        }
        else if (dotnet.isInt32(t)) {
            return 'GetInt32';
        }
        else if (dotnet.isInt64(t)) { // long
            return 'GetInt64';
        }
        else if (dotnet.isDecimal(t)) {
            return 'GetDecimal'; // becomes decimal(18,2) when using the DefaultSqlColumnSpecProvider
        }
        else if (dotnet.isSingle(t)) { // float
            return 'GetFloat';
        }
        else if (dotnet.isDouble(t)) {
            return 'GetDouble';
        }
        else if (dotnet.isDateTime(t)) {
            return 'GetDateTime'
        }
        else if (dotnet.isString(t)) {
            return 'GetString';
        }
        else if (dotnet.isChar(t)) {
            return isMultiValued ? 'GetChars' : 'GetChar';
        }
        else if (dotnet.isSByte(t)) {
            return 'GetInt16';
        }
        else if (dotnet.isObject(t)) {
            return 'GetValue';
        }        
        else return super.getDataRecordGetValueMethodForType(t, isMultiValued);
    }  
}