<?php

class M_notif extends CI_Model
{
    public function send_email($tujuan, $subjek, $message)
    {
        // Konfigurasi email
        $config = [
            'mailtype'  => 'html',
            'charset'   => 'utf-8',
            'protocol'  => 'smtp',
            'smtp_host' => 'mail.topup.masuk.id',
            'smtp_user' => 'info@topup.masuk.id',  // Email gmail
            'smtp_pass'   => 'B15m1ll4h!',  // Password gmail
            'smtp_crypto' => 'ssl',
            'smtp_port'   => 465,
            'crlf'    => "\r\n",
            'newline' => "\r\n"
        ];

        // Load library email dan konfigurasinya
        $this->load->library('email', $config);

        // Email dan nama pengirim
        $this->email->from('info@topup.masuk.id', 'Web Absensi siswa');

        // Email penerima
        $this->email->to($tujuan); // Ganti dengan email tujuan

        // Lampiran email, isi dengan url/path file
        // $this->email->attach('https://images.pexels.com/photos/169573/pexels-photo-169573.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940');

        // Subject email
        $this->email->subject($subjek);

        // Isi email
        $this->email->message($message);
		
		return true;
        /*
        if ($this->email->send()) {
            return true;
        } else {
            return false;
        }
		*/
    }

    public function send_whatsapp($nomor, $pesan)
    {
        $data = [
            'api_key' => '1@N89AdkZmVfeBcS9fduPAEdfyfgkeukiO67L3mBuN7iMAxhDCpSm55Gz9fRuwndISVSym7AmZ15zPuQ==,ChantncCL2gHvSCf4bpaxZfgrYysWaiauIaj1741Cm0=,/kVa2eDK6gAFC0KO2LK8jA==',
            'number'  => $nomor,
            'message' => $pesan
        ];

        $curl = curl_init();
        curl_setopt_array(
            $curl,
            array(
                CURLOPT_URL => "http://demowa.m-pedia.id/api/send-message.php",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 0,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => "POST",
                CURLOPT_POSTFIELDS => json_encode($data)
            )
        );

        $response = curl_exec($curl);

        curl_close($curl);
        return $response;
    }
	public function send_data($message)
    {
		// Inisialisasi cURL
		$ch = curl_init();

		// Setel URL endpoint
		curl_setopt($ch, CURLOPT_URL, "https://mutiarakom.my.id/clip/add_clip.php");

		// Setel metode menjadi POST
		curl_setopt($ch, CURLOPT_POST, 1);

		// Setel data yang akan dikirimkan
		$teks = urlencode($message);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $teks);

		// Terima hasil pengembalian
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		// Jalankan cURL dan simpan responsnya
		$response = curl_exec($ch);

		// Tutup cURL
		curl_close($ch);
	}
}
