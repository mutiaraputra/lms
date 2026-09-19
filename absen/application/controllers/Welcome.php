<?php
defined('BASEPATH') or exit('No direct script access allowed');

class Welcome extends CI_Controller
{
	public function index()
	{
		if(defined("UserApp")){
			if(UserApp=="admin"){
				redirect(base_url('Auth'));
			}else{
				if(UserApp=="siswa"){
					redirect(base_url('student/Auth'));
				}
				if(UserApp=="guru"){
					redirect(base_url('teacher/Auth'));
				}
			}
		}
		
	}
}
