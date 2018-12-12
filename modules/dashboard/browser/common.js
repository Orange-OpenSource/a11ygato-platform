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

document.addEventListener('DOMContentLoaded', function() {

    // Toggle appearance of lists of error/elements/kpi
    // ------------------------------------------------

    var expandLink             = $('[data-role="expander"]');

    expandLink.click(function() {
        $(this).parent().next().slideToggle('slow', function() {});
        if($(this).parent().hasClass('showing')){
            $(this).html('+');
        }
        else{
            $(this).html('—');
        }
        $(this).parent().toggleClass('showing');
    });

    // Initialize tooltips on page
    // ---------------------------

    $('[data-role="rules-tooltip"]').tooltip();


    // Back to top links
    // -----------------

    var toTopLinks = $('[data-role="top"]');

    toTopLinks.click(function(e) {
        e.preventDefault();
        $(animateSection($('#top'), -55));
    });

    // Function to animate sections
    function animateSection(sectionName, offset) {
        $('html,body').animate({
            scrollTop:$(sectionName).offset().top + offset
        }, 750);
    }

    // TODO: wtf is done here? Is it used anywhere?
    // --------------------------------------------

    var standardsList          = $('[data-role="standards-list"]');
    var standardSelect         = $('[data-role="new-task-select"]');
    var taskListSelector       = $('[data-role="task-list"] a');
    var dateSelectDropdownMenu = $('[data-role="date-select-dropdown-menu"]');

    // Switch standards list of rules
    switchStandardsList(standardSelect);
    $('.rules-list-title').addClass('hidden');
    $('.date-links').removeClass('list-group date-links').addClass('dropdown-menu');
    $('.dropdown-menu a').removeClass('list-group-item');
    dateSelectDropdownMenu.removeClass('hidden');

    standardSelect.change(function() {
        switchStandardsList($(this));
    });

    taskListSelector.click(function(e) {
        e.preventDefault();
        var target = $(this).attr('href');
        animateSection($(target), -25);
        if(!$(target).hasClass('showing')){
            $(target).children('[data-role="expander"]').click();
        }
    });

    // Standards list switcher for new task form
    function switchStandardsList(el) {
        standardsList.hide();
        var chosenValue = (el.val());
        $('[data-attr="' + chosenValue + '"]').show();
    }

}, { passive:true });
