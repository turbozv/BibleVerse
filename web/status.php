<?php
require("header.php");

header("content-type:text/html; charset=utf-8");

$dataDayCount = '';
$query = 'SELECT * FROM UniqueDeviceCountPerDay WHERE Date >= (NOW() - INTERVAL 90 DAY) ORDER BY Date ASC ';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    list($year, $month, $day) = split('[/.-]', $line["Date"]);
    $month = intval($month) - 1;
    $count = $line["DeviceCount"];
    $dataDayCount .= "{ x: new Date($year, $month, $day), y: $count},";
}
mysql_free_result($result);

$dataMonthlyCount = '';
$query = 'SELECT * FROM monthlyActiveUsers WHERE date >= (NOW() - INTERVAL 90 DAY) ORDER BY Date ASC ';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    list($year, $month, $day) = split('[/.-]', $line["date"]);
    $month = intval($month) - 1;
    $count = $line["count"];
    $dataMonthlyCount .= "{ x: new Date($year, $month, $day), y: $count},";
}
mysql_free_result($result);

$dataLastSeenCount = '';
$query = 'SELECT * FROM LastSeenDeviceCountView';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
$today = time();
$count = 0;
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $dateDiff = $today - strtotime($line['day']);
    $dayDiff = floor($dateDiff / (60 * 60 * 24));
    $count += $line['count'];
    $dataLastSeenCount .= "{ x: $dayDiff, y: $count},";
}
mysql_free_result($result);

$android = 0;
$ios = 0;
$unknown = 0;
$total = 0;
$query = 'SELECT * FROM PlatformOSView';
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $platform = $line["platformOS"];
    $count = $line["count"];
    $total += $count;
    if ($platform == "android") {
        $android = $count;
    } elseif ($platform == "ios") {
        $ios = $count;
    } else {
        //$unknown = $count;
        $total -= $count;
    }
}
mysql_free_result($result);
//echo "<br>$ios - $android - $unknown - $total";
$iosPer = round($ios * 100 / $total, 2);
$androidPer = round($android * 100 / $total, 2);
$unknownPer = round($unknown * 100 / $total, 2);
$dataPlatform = "{ y: $iosPer , count: $ios, label: 'iOS' },{ y: $androidPer, count: $android, label: 'Android' }";
if ($unknown > 0) {
    $dataPlatform .= ", { y: $unknownPer, count: $unknown, label: 'Unknown' }";
}

// GeoIP
require 'vendor/autoload.php';
$gi = geoip_open("GeoIP.dat", GEOIP_STANDARD);

$query = 'SELECT * FROM clientInfo';
$array = array();
$totalIpAddress = 0;
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $country = $line['country'];
    if (strlen($country) < 1) {
        $country = geoip_country_name_by_addr($gi, $line["ip"]);
    }
    $value = 1;
    if (isset($array[$country])) {
        $value = $array[$country] + 1;
    }
    $array[$country] = $value;
    $totalIpAddress++;
}
mysql_free_result($result);
geoip_close($gi);

$dataIP = '';
arsort($array);
foreach ($array as $key => $val) {
    $percent = round($val * 100 / $totalIpAddress, 2);
    $dataIP .= "{y: $percent, count: $val, label: '$key'},";
}

$query = 'SELECT lang, count(*) as count FROM clientInfo GROUP BY lang';
$array = array();
$totalCount = 0;
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $lang = $line['lang'];
    if ($lang == 'Unknown') {
        $lang = 'eng';
    }
    $array[$lang] = $line['count'];
    $totalCount += $line['count'];
}
mysql_free_result($result);

$dataLanguage = '';
arsort($array);
foreach ($array as $key => $val) {
    $percent = round($val * 100 / $totalCount, 2);
    $dataLanguage .= "{y: $percent, count: $val, label: '$key'},";
}

// Device versions
$query = 'SELECT * FROM VersionView';
$array = array();
$totalVersionCount = 0;
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $array[$line['version']] = $line['count'];
    $totalVersionCount += $line['count'];
}
mysql_free_result($result);

$dataVersion = '';
foreach ($array as $key => $val) {
    $percent = round($val * 100 / $totalVersionCount, 2);
    if ($key == '') {
        $key = 'Unknown';
    }
    $dataVersion .= "{y: $percent, count: $val, label: '$key'},";
}

?>
<table width="100%">
<tr>
  <td colspan="2">
    <div id="chartContainerDayCount" style="height: 370px; width: 100%;"></div>
  </td>
</tr>
<tr>
  <td colspan="2">
    <div id="chartContainerMonthlyCount" style="height: 370px; width: 100%;"></div>
  </td>
</tr>
<tr>
  <td>
    <div id="chartContainerPlatform" style="height: 370px; width: 100%;"></div>
  </td>
  <td>
    <div id="chartContainerLanguage" style="height: 370px; width: 100%;"></div>
  </td>
</tr>
<tr>
  <td>
    <div id="chartContainerIP" style="height: 370px; width: 100%;"></div>
  </td>
  <td>
    <div id="chartContainerVersion" style="height: 370px; width: 100%;"></div>
  </td>
</tr>
<tr>
  <td colspan="2">
    <div id="chartContainerLastSeenCount" style="height: 370px; width: 100%;"></div>
  </td>
</tr>
</table>
<script src="https://canvasjs.com/assets/script/canvasjs.min.js"></script>
<script>
window.onload = function () {

new CanvasJS.Chart("chartContainerDayCount", {
	theme: "light1", // "light1", "light2", "dark1", "dark2"
	exportEnabled: true,
	animationEnabled: false,
	title:{
		text: "Daily active devices (Last 90 days)"
	},
	axisX: {
		interval: 5,
		intervalType: "day",
		valueFormatString: "YYYY/MM/DD"
	},
	axisY:{
		title: "Unique devices",
		valueFormatString: "#0"
	},
	data: [{        
		type: "line",
		markerSize: 12,
		xValueFormatString: "YYYY/MM/DD",
		yValueFormatString: "###",
		dataPoints: [
			<?php echo $dataDayCount; ?>
		]
	}]
}).render();

new CanvasJS.Chart("chartContainerMonthlyCount", {
	theme: "light1", // "light1", "light2", "dark1", "dark2"
	exportEnabled: true,
	animationEnabled: false,
	title:{
		text: "Monthly active devices (Last 90 days)"
	},
	axisX: {
		interval: 5,
		intervalType: "day",
		valueFormatString: "YYYY/MM/DD"
	},
	axisY:{
		title: "Unique devices",
		valueFormatString: "#0"
	},
	data: [{        
		type: "line",
		markerSize: 12,
		xValueFormatString: "YYYY/MM/DD",
		yValueFormatString: "###",
		dataPoints: [
			<?php echo $dataMonthlyCount; ?>
		]
	}]
}).render();


new CanvasJS.Chart("chartContainerPlatform", {
	theme: "light1", // "light1", "light2", "dark1", "dark2"
	exportEnabled: true,
	title: {
		text: "Device platform (Total: <?php echo $total; ?>)"
	},
	data: [{
		type: "pie",
		startAngle: 25,
		toolTipContent: "<b>{label}({count})</b>: {y}%",
		indexLabelFontSize: 16,
		indexLabel: "{label}({count}) - {y}%",
		dataPoints: [
			<?php echo $dataPlatform; ?>
		]
	}]
}).render();

new CanvasJS.Chart("chartContainerIP", {
	theme: "light1", // "light1", "light2", "dark1", "dark2"
	exportEnabled: true,
	title: {
		text: "Device IP geo-location"
	},
	data: [{
		type: "pie",
		startAngle: 25,
		toolTipContent: "<b>{label}({count})</b>: {y}%",
		indexLabelFontSize: 16,
		indexLabel: "{label}({count}) - {y}%",
		dataPoints: [
			<?php echo $dataIP; ?>
		]
	}]
}).render();

new CanvasJS.Chart("chartContainerVersion", {
	theme: "light1", // "light1", "light2", "dark1", "dark2"
	exportEnabled: true,
	title: {
		text: "Device version (within 30 days)"
	},
	data: [{
		type: "pie",
		startAngle: 25,
		toolTipContent: "<b>{label}({count})</b>: {y}%",
		indexLabelFontSize: 16,
		indexLabel: "{label}({count}) - {y}%",
		dataPoints: [
			<?php echo $dataVersion; ?>
		]
	}]
}).render();

new CanvasJS.Chart("chartContainerLanguage", {
	theme: "light1", // "light1", "light2", "dark1", "dark2"
	exportEnabled: true,
	title: {
		text: "Device language"
	},
	data: [{
		type: "pie",
		startAngle: 25,
		toolTipContent: "<b>{label}({count})</b>: {y}%",
		legendText: "{label}",
		indexLabelFontSize: 16,
		indexLabel: "{label}({count}) - {y}%",
		dataPoints: [
			<?php echo $dataLanguage; ?>
		]
	}]
}).render();

new CanvasJS.Chart("chartContainerLastSeenCount", {
	theme: "light1", // "light1", "light2", "dark1", "dark2"
	exportEnabled: true,
	animationEnabled: false,
	title:{
		text: "Active devices within last N days"
	},
	data: [{        
		type: "line",
		markerSize: 12,
		dataPoints: [
			<?php echo $dataLastSeenCount; ?>
		]
	}]
}).render();

}
</script>
<?php
require("footer.php");
?>
