$(function() {

  jQuery.fn.extend({

    mobileTable: function () {

      var $table = $(this),
          $headers = $table.find("thead th"),
          $rows = $table.find("tbody tr"),
          attribute = "data-th";

      // Generate array that contains text from each header

      var headerValues = $headers.map(function(key, header){
        return $(header).text();
      });

      // Loop through each column in each row, adding the associated headerText
      // to the `data-th` attribute

      $.each($rows, function(key, row) {
        var $columns = $(row).find("td, th");
        $.each($columns, function(key, column) {
          var $column = $(column),
              headerValue = headerValues[key];
          $column.attr(attribute, headerValue);
        });
      });

      // Add mobile class which will recieve styling for mobile

      $table.addClass("table-mobile-stacked");

    }

  });

});
