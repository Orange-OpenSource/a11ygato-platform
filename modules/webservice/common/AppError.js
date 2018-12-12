/*
    @license
    @a11ygato/webservice
    Copyright (C) 2018 Orange

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function AppError(message, code, statusCode){
    // Can't call super on class Error in javascript.
    this.message = message;

    // New field which is not in Error and encapsulate a functional error code.
    this.code = code;

    // New field which is not in Error and encapsulate an HTTP status code.
    this.statusCode = statusCode || 500;

    // Without passing AppError to captureStackTrace, the AppError
    // frame would show up in the .stack property. By passing
    // the constructor, we omit that frame, and retain all frames below it.
    Error.captureStackTrace(this, AppError);
}

AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

module.exports = AppError;

////////////

// Implicitly we agree on the fact that an error which is not an instance of Error is a String.
AppError.fromErr = function fromErr(err){
    return err instanceof Error ? err : new AppError(err);
};

AppError.UserNotFound = function(){
    return new AppError('No user with these credentials', 9000, 401);
};

AppError.MissingMandatoryField = function(){
    return new AppError('Missing mandatory field', 9001, 400);
};

AppError.EmailAlreadyInUse = function(){
    return new AppError('Email already in use', 9002, 400);
};

/////////////

AppError.prototype.toJSON = function toJSON(){
    return {code:this.code, statusCode:this.statusCode, message:this.message};
};


