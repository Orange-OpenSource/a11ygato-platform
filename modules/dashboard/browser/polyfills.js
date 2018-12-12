/*
    @license
    @a11ygato/dashboard
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

// Fetch polyfill
// --------------

if(!window.fetch) addScript({ src:'/fetch.min.js?v={{version}}' });

// Promise polyfill
// ----------------

if(!window.Promise) addScript({ src:'/promise.min.js?v={{version}}' });

// Vanilla debounce utility function
// ---------------------------------

function debounce(func, wait) {
    wait = wait || 100;
    var timeout;
    return function() {
        var args  = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(this, args);
        }, wait);
    };
}

window.debounce = debounce;

// Vanilla add script utility function
// -----------------------------------

function addScript(attributes, text, callback) {
    var s = document.createElement('script');
    for (var key in attributes) {
        s.setAttribute(key, attributes[key]);
    }
    s.innerHTML = text;
    s.onload = callback;
    document.body.appendChild(s);
}

window.addScript = addScript;
