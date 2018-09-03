<?php
require("header.php");
header("content-type:text/html; charset=utf-8");

$classIds = $_SESSION['classIds'];

if (isset($_POST['classId'])) {
    $value = intval($_POST['classId']);
    if (isset($classIds[$value])) {
        $_SESSION['classId'] = $value;
    }
}

$classId = $_SESSION['classId'];

?>

  <h2>Welcome to BSF admin page</h2>
  <p>Hello, your email is [<?php echo $login_user_email;?>], class is [<?php echo $classIds[$classId];?>]</p>

  <form method='post'>
    <p>Change class:
      <select name='classId' onchange='this.form.submit()'>
      <?php
      reset($classIds);
      foreach ($classIds as $key => $value) {
          $param = '';
          if ($classId == $key) {
              $param = " selected='selected'";
          }
          echo "<option value='$key'$param>$value</option>";
      }
      ?>
      </select>
    </p>
  </form>
<?php
require("footer.php");
?>
