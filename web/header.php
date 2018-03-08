<?php
require("lib/usercheck.php");
$startTime = round(microtime(true) * 1000);
?>

<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
}

.topnav {
  overflow: hidden;
  background-color: #333;
}

.topnav a {
  float: left;
  color: #f2f2f2;
  text-align: center;
  padding: 14px 16px;
  text-decoration: none;
  font-size: 17px;
}

.topnav a:hover {
  background-color: #ddd;
  color: black;
}

.topnav a.active {
  background-color: #fcaf17;//#4CAF50;
  color: white;
}
</style>
</head>
<body>

<?php
function getLink($page, $name)
{
    if (basename($_SERVER['PHP_SELF']) == $page) {
        return "<a class='active'>$name</a>";
    } else {
        return "<a href=$page>$name</a>";
    }
}
?>

<div class="topnav">
<?php 
echo getLink("index.php", "主页");
echo getLink("attendanceAdult.php", "成人出席表");
echo getLink("attendanceSP.php", "儿童出席表");
echo getLink("editAttendance.php", "编辑出席表");
echo getLink("feedback.php", "App用户反馈");
echo getLink("status.php", "App访问统计");
echo getLink("phpMyAdmin.php", "PhpMyAdmin");
echo getLink("logout.php", "登出");
?>
</div>

<div style="padding-left:16px">
