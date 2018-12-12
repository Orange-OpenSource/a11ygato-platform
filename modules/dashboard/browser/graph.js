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

/*
    @license
    This file is part of pa11y-dashboard.

    pa11y-dashboard is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    pa11y-dashboard is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with pa11y-dashboard.  If not, see <http://www.gnu.org/licenses/>.
*/

document.addEventListener('DOMContentLoaded', function() {

    var data                   = {};
    var zoomResetButton        = $('[data-role="zoom-reset"]');
    var graphContainer         = $('[data-role="graph"]');

    var graphOptions = {
        series:{
            lines:{ show:true },
            points:{ show:true },
            hoverable:true
        },
        xaxis:{
            mode:'time',
            tickLength:0,
            minTickSize:[1, 'day'],
            timeformat:'%d %b'
        },
        yaxis:{
            tickDecimals:0
        },
        lines:{
            lineWidth:3
        },
        grid:{
            backgroundColor:'#fff',
            borderColor:'#808080',
            hoverable:true,
            clickable:true,
            borderWidth:{
                top:1,
                right:1,
                bottom:1,
                left:1
            }
        },
        selection:{
            mode:'x'
        }
    };

    zoomResetButton.click(function() {
        plotGraphData();
        toggleResetZoomButton();
    });

    $.each(graphContainer, function() {
        getGraphData();
        plotGraphData();
    });

    function getGraphData() {
        $($('[data-role="url-stats"]').get().reverse()).each(function() {
            var el = $(this);
            storeDatum(el, getXAxisLabel(el));
        });
    }

    function getXAxisLabel(el) {
        return el.find('[data-role="date"]').attr('data-value');
    }

    function storeDatum(el, label) {
        $.each(el.find('[data-label]'), function() {
            var type  = $(this).attr('data-label');
            var value = $(this).html();
            if(typeof data[type] === 'undefined'){
                data[type] = [];
            }
            data[type].push([label, +value]);
        });
    }

    function plotGraphData() {
        $.plot(graphContainer, getData(), graphOptions);
    }

    function getData() {
        return [

            { color:'rgb(23, 123, 190)', label:'KPI', data:data.kpi },
            { color:'rgb(168, 103, 0)', label:'Errors', data:data.error },
            { color:'rgb(216, 61, 45)', label:'Elements', data:data.numElements }
        ];
    }

    function toggleResetZoomButton() {
        zoomResetButton.toggleClass('hidden');
    }

    graphContainer.bind('plotselected', function(event, ranges) {
        // clamp the zooming to prevent eternal zoom
        if(ranges.xaxis.to - ranges.xaxis.from < 0.00001){
            ranges.xaxis.to = ranges.xaxis.from + 0.00001;
        }
        if(ranges.yaxis.to - ranges.yaxis.from < 0.00001){
            ranges.yaxis.to = ranges.yaxis.from + 0.00001;
        }
        // do the zooming
        $.plot(graphContainer, getData(ranges.xaxis.from, ranges.xaxis.to),
            $.extend(true, {}, graphOptions, {
                xaxis:{ min:ranges.xaxis.from, max:ranges.xaxis.to },
                yaxis:{ min:ranges.yaxis.from, max:ranges.yaxis.to }
            })
        );
        if(!zoomResetButton.is(':visible')){
            toggleResetZoomButton();
        }
    });

    var choiceContainer = $('[data-role="series-checkboxes"]');
    var datasets        = getData();

    $.each(datasets, function(key, val) {
        var lowerCaseValue = (val.label.substring(0, val.label.length - 1)).toLowerCase();
        choiceContainer.append(
            '<li class="text-center ' + lowerCaseValue + '">' +
            '<div class="series-checkbox-container">' +
            '<input type="checkbox"' +
            'name="' + key + '" ' +
            'id="id' + key + '" ' +
            'data-stat-type="' + val.label.toLowerCase() + '"' +
            '/>' +
            '<label for="id' + key + '">' +
            '<span class="stat-type">' + val.label + '</span>' +
            '</label>' +
            '</div>' +
            '</li>'
        );

    });

    choiceContainer.find('input').click(plotAccordingToChoices);
    choiceContainer.find('[data-stat-type=kpi]').click();

    function plotAccordingToChoices() {
        var data = [];
        choiceContainer.find('input:checked').each(function() {
            var key = $(this).attr('name');
            if(key && datasets[key]){
                data.push(datasets[key]);
            }
        });

        if(data.length > -1){
            $.plot(graphContainer, data, graphOptions);
        }
    }

    function showTooltip(x, y, contents) {
        $('<div data-role="tooltip" class="tooltip tooltip-graph in"><div class="tooltip-inner">' +
            contents +
            '</div></div>').css({ top:y + 5, left:x + 5 }).appendTo('body').fadeIn(200);
    }

    var previousPoint = null;
    graphContainer.bind('plothover', function(event, pos, item) {
        if(item){
            if(previousPoint != item.dataIndex){
                previousPoint = item.dataIndex;
                $('[data-role="tooltip"]').remove();
                var count    = item.datapoint[1].toFixed(0);
                var date     = $.plot.formatDate(new Date(item.datapoint[0]), '%d %b' +
                    '<small> (%H:%M)</small>');
                var contents = '<p class="crunch">' +
                    date + '<br/>' +
                    count + ' ' + item.series.label +
                    '</[h6]>';
                showTooltip(item.pageX, item.pageY, contents);
            }
        } else{
            $('[data-role="tooltip"]').remove();
            previousPoint = null;
        }
    });

}, { passive:true });
