<?php
session_start();

$login_user = $_SESSION['login_user'];
if (!$login_user) {
	header("Location: admin.php");
	exit;
}
/*foreach ($_POST as $param_name => $param_val) {
	echo "$param_name=>$param_val<br />\n";
}*/

require("dbconnect.php");
?>

Home page (<?php echo $login_user; ?>)
<li><a href='attendance.php'>Attendance</a>
<li><a href='logout.php'>Logout</a>
