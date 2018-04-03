<link rel="stylesheet" href="css/style.css">

<?php
require("header.php");
require("lib/mysql.php");

header("content-type:text/html; charset=utf-8");

// Get user roles
$g_users = getUsers();

// TODO: Support different class
$class = 1;
$row = getRow("select name from class where id=$class");
echo "<h3>出席表 Class: $row[0]</h3>";

$classAttendChildren = array();
$classTotalChildren = array();

$query = "select distinct `group` from users where class=$class and `group` >= 100 and `group` < 200 order by `group` asc ";
$result = mysql_query($query) or die('Query failed: ' . mysql_error());
while ($line = mysql_fetch_array($result, MYSQL_ASSOC)) {
    $group = $line["group"];
    echo "<h4>儿童小组#".$group."<br>";
    $leaderId = getLeaderId($group);
    
    // get all member names
    $members = getMembers($class, $group);

    $attend = array();
    $totalUsers = array();
    $query = "select * from attendanceDates where class=$class order by date asc";
    $result2 = mysql_query($query) or die('Query failed: ' . mysql_error());
    while ($line = mysql_fetch_array($result2, MYSQL_ASSOC)) {
        $date = $line["date"];
        // find attendance by group
        $row = getRow("select users, totalUsers from attendance where `date`='$date' and `group`=$group order by submitDate desc limit 1");
        if ($row === false) {
            $attend[$date] = "";
            $totalUsers[$date] = 0;
        } else {
            if ($row[0] == "[]") {
                $attend[$date] = "";
            } else {
                $attend[$date] = substr($row[0], 1, -1).',';
            }
            $totalUsers[$date] = $row[1];
        }
        //echo "$date => $attend[$date] totalUsers: $totalUsers[$date]<br>";
    }

    echo "<table border=1><tr><td style='min-width: 240px;'>";
    $idx = 0;
    while (list($date, $users) = each($attend)) {
        list($year, $month, $day) = split('[/.-]', $date);
        echo "<td width='30' align='center'>#$idx<br>$month/$day";
        $idx++;
    }

    reset($members);
    $id = 1;
    while (list($userId, $name) = each($members)) {
        echo "<tr><td>$id. $name";
        reset($attend);
        while (list($date, $users) = each($attend)) {
            if (strpos($users, $userId.',') === false) {
                if (!isUserInGroupOnDate($userId, $group, $date)) {
                    $check = '-';
                } else {
                    $check = '';
                }
            } else {
                $check = '√';
            }
            echo "<td align='center'>$check";
        }
        $id++;
    }

    echo "<tr><td>出席总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = substr_count($users, ',');
        $classAttendChildren[$date] = (isset($classAttendChildren[$date])? $classAttendChildren[$date]: 0) + $count;
        echo "<td align='center'>$count";
    }

    $totalCountByDate = array();
    echo "<tr><td>注册总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = $totalUsers[$date];
        $totalCountByDate[$date] = $count;
        $classTotalChildren[$date] = (isset($classTotalChildren[$date])? $classTotalChildren[$date]: 0) + $count;
        echo "<td align='center'>$count";
    }

    echo "<tr><td>(%)百分比:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = substr_count($users, ',');
        $totalCount = $totalCountByDate[$date];
        if ($totalCount == 0) {
            $percent = 0;
        } else {
            $percent = round($count / $totalCount * 100);
        }
        echo "<td align='center'>$percent%";
    }

    echo "</table>";
}
mysql_free_result($result);

echo "<br><br><b>全班儿童总计</b>";
echo "<table border=1><tr><td style='min-width: 240px;'>";
$idx = 0;
reset($classAttendChildren);
while (list($date, $count) = each($classAttendChildren)) {
    list($year, $month, $day) = split('[/.-]', $date);
    echo "<td width='30' align='center'>#$idx<br>$month/$day";
    $idx++;
}

echo "<tr><td>出席总人数:";
reset($classAttendChildren);
while (list($date, $count) = each($classAttendChildren)) {
    echo "<td align='center'>$count";
}

echo "<tr><td>注册总人数:";
$classTotal = array();
reset($classAttendChildren);
while (list($date, $count) = each($classAttendChildren)) {
    $count = $classTotalChildren[$date];
    $classTotal[$date] = $count;
    echo "<td align='center'>$count";
}

echo "<tr><td>(%)百分比:";
reset($classAttendChildren);
while (list($date, $count) = each($classAttendChildren)) {
    $total = $classTotal[$date];
    if ($total == 0) {
        $percent = 0;
    } else {
        $percent = round($count / $total * 100);
    }
    echo "<td align='center'>$percent%";
}

echo "</table>";
require("footer.php");
?>
