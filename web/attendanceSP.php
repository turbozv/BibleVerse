<link rel="stylesheet" href="css/style.css">

<?php
require("header.php");

header("content-type:text/html; charset=utf-8");

// Get user roles
$g_users = getUsers();

$class = $_SESSION['classId'];
$row = getRow("select name from class where id=$class");
echo "<h3>出席表 Class: $row[0]</h3>";

$classAttendChildren = array();
$classTotalChildren = array();

$groups = getSPGroups($class);
$results = array();
foreach ($groups as $key => $group) {
    echo "<h4>".getGroupDisplayName($class, $group)."<br>";
    $leaderId = getLeaderId($group);
    
    // get all member names
    $members = getMembers($class, $group);

    $attend = getAttendanceDates($class, $group);

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
        echo "<tr><td>$id. $name (<a href='users.php?user=$userId'>#$userId</a>)";
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
            $results[$group][$userId][$date] = $check;
        }
        $id++;
    }

    echo "<tr><td>出席总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = 0;
        foreach ($results[$group] as $user => $value) {
            if ($value[$date] == '√') {
                $count++;
            }
        }
        $classAttendChildren[$date] = (isset($classAttendChildren[$date])? $classAttendChildren[$date]: 0) + $count;
        echo "<td align='center'>$count";
    }

    $totalCountByDate = array();
    echo "<tr><td>注册总人数:";
    reset($attend);
    while (list($date, $users) = each($attend)) {
        $count = 0;
        foreach ($results[$group] as $user => $value) {
            if ($value[$date] != '-') {
                $count++;
            }
        }
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

// Summary
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
