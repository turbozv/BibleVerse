<?php
$startTime = round(microtime(true) * 1000);

header("content-type:text/html; charset=utf-8");
require("dbconnect.php");

$query = 'SELECT * FROM TotalUniqueDeviceCount';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
$line = mysql_fetch_array($result, MYSQL_ASSOC);
$total = $line["DeviceCount"];
mysql_free_result($result);

$query = 'SELECT * FROM AverageResponseTime';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
$line = mysql_fetch_array($result, MYSQL_ASSOC);
$responseTime = substr($line["AveResponseTime(ms)"], 0, 4)."ms";
mysql_free_result($result);

$x_data = "";
$y_data = "";
$query = 'SELECT * FROM UniqueDeviceCountPerDay';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
                list($year, $month, $day) = split('[/.-]',$line["Date"]);
                $month = intval($month)-1;
                $count = $line["DeviceCount"];
                $x_data = $x_data."new Date($year, $month, $day),";
                $y_data = $y_data."$count,";
}
mysql_free_result($result);

$endTime = round(microtime(true) * 1000);
//echo "<br><br><br>This page is generated in ".($endTime-$startTime)."ms";
?>
<head>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>

<body>
  <p>Total unique devices: <?php echo $total;?></p>
  <p>Average response time: <?php echo $responseTime;?></p>
  <div id="myDiv"><!-- Plotly chart will be drawn inside this DIV --></div>
  <script>
        var trace = {
          x: [<?php echo $x_data;?>],
          y: [<?php echo $y_data;?>],
          type: 'scatter'
        };
        Plotly.newPlot('myDiv', [trace]);
  </script>
</body>
~

