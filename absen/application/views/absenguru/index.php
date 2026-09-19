<div class="content-body">
    <!-- row -->
    <?php
    $sqlsabtu = "SELECT status FROM tabel_libur WHERE type = 'weekend' AND keterangan = 'sabtu' ";
    $sabtu = $this->db->query($sqlsabtu)->result_array()[0]['status'];
    $sqlminggu = "SELECT status FROM tabel_libur WHERE type = 'weekend' AND keterangan = 'minggu' ";
    $minggu = $this->db->query($sqlminggu)->result_array()[0]['status'];

    ?>
    <div class="container-fluid">
        <div class="page-titles">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="javascript:void(0)">Absen</a></li>
                <!-- <li class="breadcrumb-item active"><a href="javascript:void(0)">Data User</a></li> -->
            </ol>
        </div>
        <?php if ($this->session->flashdata('flash')) : ?>
            <div class="alert alert-<?= $this->session->flashdata('flash')['alert'] ?> alert-dismissible alert-alt fade show my-4 mx-5">
                <button type="button" class="close h-100" data-dismiss="alert" aria-label="Close"><span><i class="mdi mdi-close"></i></span>
                </button>
                <strong><?= $this->session->flashdata('flash')['alert'] ?>!</strong> <?= $this->session->flashdata('flash')['message']; ?>.
            </div>
        <?php endif; ?>
        <div class="row">
            <div class="col-12 ">
                <div class="card">
                    <div class="card-header">
                        <h4>Cari absen</h4>
                    </div>
                    <div class="card-body">

                        <form action="" method="get" class="form-horizontal">
                            <div class="form-row">
                                <div class="form-group col-md-3">
                                    <label class="control-label">NIK</label>
                                    <div class="controls">
                                        <input type="number" value="<?= (isset($_GET['nik'])) ?  $_GET['nik'] : '' ?>" class="form-control" name="nik" />
                                    </div>
                                </div>
                                <div class="form-group col-md-3">
                                    <label class="control-label">Bulan</label>
                                    <div class="controls">
                                        <select name="bulan" required="true" class="form-control">
                                            <option value="" disabled selected>Pilih bulan..</option>
                                            <option value="01">Januari</option>
                                            <option value="02">Februari</option>
                                            <option value="03">Maret</option>
                                            <option value="04">April</option>
                                            <option value="05">Mei</option>
                                            <option value="06">Juni</option>
                                            <option value="07">Juli</option>
                                            <option value="08">Agustus</option>
                                            <option value="09">September</option>
                                            <option value="10">Oktober</option>
                                            <option value="11">November</option>
                                            <option value="12">Desember</option>
                                        </select>
                                    </div>
                                </div>
                                <!-- <div class="form-group col-md-3">
                                    <label class="control-label">Tahun</label>
                                    <div class="controls">
                                        <select name="tahun" id="kelas" class="form-control" required>
                                            <option value="0" disabled>Pilih Tahun</option>
                                            <option value="2021">2021</option>
                                            <option value="2022">2022</option>
                                            <option value="2023">2023</option>
                                            <option value="2024">2024</option>
                                            <option value="2025">2025</option>
                                        </select>
                                    </div>
                                </div> -->
                            </div>


                            <div class="form-actions">
                                <button type="submit" name="cariabsen" value="isset" class="btn-sm btn btn-secondary"> <i class="flaticon-381-search-1"></i> Cari Absen</button>

                            </div>
                        </form>


                    </div>
                </div>
            </div>
        </div>
        <div class="row">

            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Data Absen <?= $desc ?></h4>
                        <?php
                        $gettahun = date('Y');
                        if (isset($_GET['cariabsen'])) {
                            if (isset($_GET['bulan'])) {
                                $getbulan = $_GET['bulan'];
                            } else {
                                $getbulan = date('m');
                            }
                            if (isset($_GET['nik'])) {
                                $getnik = $_GET['nik'];
                            } else {
                                $getnik = '';
                            }
                            $gett = 'nik=' . $getnik . '&bulan=' . $getbulan;
                        } else {
                            $gett = 'nik=&bulan=' . date('m');
                        }
                        ?>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">

                            <form action="<?= base_url() ?>absenguru/input" method="POST">
                                <table class="table table-bordered table-striped with-check">

                                    <thead>
                                        <tr>
                                            <th rowspan=" 2">NIK</th>
                                            <th rowspan=" 2">Nama Guru</th>
                                            <th rowspan="2">L/P</th>
                                            <?php for ($tanggal_table = 1; $tanggal_table <= 31; $tanggal_table++) {
                                                echo "<th rowspan='2'>$tanggal_table</th>";
                                            } ?>
                                            <th colspan="4">Jumlah</th>
                                        </tr>
                                        <tr>
                                            <th>A</th>
                                            <th>I</th>
                                            <th>S</th>
                                            <th>T</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($guru as $d) :  ?>
                                            <tr>
                                                <td><?= $d['nik']; ?></td>
                                                <td><?= $d['nama_guru']; ?></td>
                                                <td><?= $d['jenik_kelamin']; ?></td>
                                                <?php
                                                $nomor2 = 1;
                                                // $sisa_td = 30;
                                                //mengabil tanggal 
                                                $keterangan_alpha = 0;
                                                $keterangan_izin = 0;
                                                $keterangan_sakit = 0;
                                                $keterangan_terlambat = 0;

                                                $nik = $d['nik'];
                                                $cari_bulan_guru = date('m');
                                                $tahun = date('Y');
                                                if (isset($_GET['bulan'])) {
                                                    $bulan = $_GET['bulan'];
                                                    $sql = "SELECT * FROM tabel_detail_absen_guru WHERE nik = '$nik' AND tanggal_absen LIKE '%$tahun-$bulan%' ORDER BY tanggal_absen ASC";
                                                } else {
                                                    $sql = "SELECT * FROM tabel_detail_absen_guru WHERE nik = '$nik' AND tanggal_absen LIKE '%$tahun-$cari_bulan_guru%' ORDER BY tanggal_absen ASC";
                                                    $bulan = date('m');
                                                }

                                                $query = $this->db->query($sql);

                                                if ($query->num_rows() > 0) {
                                                    
                                                    foreach ($query->result_array() as $absen) {

                                                        //mengabil tanggal 
                                                        $ambil_tanggal = explode("-", $absen['tanggal_absen']);
                                                        //merubah menjadi tanggal jadi integer
                                                        $ambil_tanggal[2] = (int)$ambil_tanggal[2];
                                                        for ($nomor = $nomor2; $nomor <= $ambil_tanggal[2]; $nomor++) {
                                                            // mengetahui hari minggu
                                                            $nomor < 10 ? $tgl = '0' . $nomor : $tgl = $nomor;
                                                            $tanggal = date('Y') . '-' . $bulan . '-' . $tgl;
                                                            $hari = date('D', strtotime($tanggal));
                                                            // cek libur
                                                            $sqllibur = "SELECT * FROM tabel_libur WHERE tanggal = '$tahun-$bulan-$tgl' AND status = 'Aktif'";
                                                            $datalibur = $this->db->query($sqllibur)->result_array();

                                                            //
                                                            if ($nomor == $ambil_tanggal[2]) {

                                                                if (count($datalibur) > 0) {
                                                                    echo '<td class="bg-danger">' . $datalibur[0]['keterangan'] . '</td>';
                                                                } else if ($hari == 'Sun' && $minggu == 'Aktif' || $hari == 'Sat' && $sabtu == 'Aktif') {
                                                                    echo '<td class="bg-danger"></td>';
                                                                } else {
                                                                    if ($absen['keterangan'] == 'h') {
                                                                        if ($absen['masuk'] == 1 && $absen['keluar'] == 1) {
                                                                            echo '<td> <i class="fa fa-check"></i></td>';
                                                                        } else {
                                                                            echo "<td><b>1/2</b></td>";
                                                                        }
                                                                    } else if ($absen['keterangan'] == 's' || $absen['keterangan'] == 'a' || $absen['keterangan'] == 'i') {
                                                                        echo "<td><b>" . strtoupper($absen['keterangan']) . " </b></td>";
                                                                    } else {
                                                                        echo '<td></td>';
                                                                    }
                                                                }
                                                            } else {
                                                                echo '<td></td>';
                                                            }
                                                        }
                                                        //meng rekap bulannan
                                                        $nomor2 = $ambil_tanggal[2] + 1;
                                                        $sisa_td = 31 - $nomor2;
                                                        if ($absen['keterangan'] == 'a') {
                                                            $keterangan_alpha++;
                                                        } else if ($absen['keterangan'] == 'i') {
                                                            $keterangan_izin++;
                                                        } else if ($absen['keterangan'] == 's') {
                                                            $keterangan_sakit++;
                                                        } else if ($absen['keterangan'] == 't') {
                                                            $keterangan_alpha++;
                                                        }
                                                    }
                                                    for ($td = 0; $td <= $sisa_td; $td++) {
                                                        $tgl = $nomor2 + $td;
                                                        $tgl < 10 ? $tgl2 = '0' . $tgl : $tgl2 = $tgl;
                                                        $tanggal = date('Y') . '-' . $bulan . '-' . $tgl2;
                                                        $hari = date('D', strtotime($tanggal));
                                                        // cek libur
                                                        $sqllibur = "SELECT * FROM tabel_libur WHERE tanggal = '$tahun-$bulan-$tgl' AND status = 'Aktif'";
                                                        $datalibur = $this->db->query($sqllibur)->result_array();

                                                        if ($td == $tgl) {

                                                            if (count($datalibur) > 0) {
                                                                echo '<td class="bg-danger">' . $datalibur[0]['keterangan'] . '</td>';
                                                            } else if ($hari == 'Sun' && $minggu == 'Aktif' || $hari == 'Sat' && $sabtu == 'Aktif') {
                                                                echo '<td class="bg-danger"></td>';
                                                            } else {
                                                                if ($absen['keterangan'] == 'h') {
                                                                    if ($absen['masuk'] == 1 && $absen['keluar'] == 1) {
                                                                        echo '<td> <i class="fa fa-check"></i></td>';
                                                                    } else {
                                                                        echo "<td><b>1/2</b></td>";
                                                                    }
                                                                } else if ($absen['keterangan'] == 's' || $absen['keterangan'] == 'a' || $absen['keterangan'] == 'i') {
                                                                    echo "<td><b>" . strtoupper($absen['keterangan']) . " </b></td>";
                                                                } else {
                                                                    echo '<td></td>';
                                                                }
                                                            }
                                                        } else {
                                                            echo '<td></td>';
                                                        }
                                                    }
                                                    //tampilan rekap absen
                                                    echo "<td>$keterangan_alpha</td>
                                                <td>$keterangan_izin</td>
                                                <td>$keterangan_sakit</td>
                                                <td>$keterangan_terlambat</td>";
                                                    $keterangan_alpha = 0;
                                                    $keterangan_sakit = 0;
                                                    $keterangan_izin = 0;
                                                    $keterangan_terlambat = 0;
                                                } else {

                                                    $sisa_td = 30;
                                                    for ($td = 0; $td <= $sisa_td; $td++) {
                                                        $tgl = $td + 1;
                                                        $tgl < 10 ?  $tgl2 = '0' . $tgl : $tgl2 = $tgl;
                                                        $tanggal = date('Y') . '-' . $bulan . '-' . $tgl;
                                                        $hari = date('D', strtotime($tanggal));


                                                        // cek libur
                                                        $sqllibur = "SELECT * FROM tabel_libur WHERE tanggal = '$tahun-$bulan-$tgl' AND status = 'Aktif'";
                                                        $datalibur = $this->db->query($sqllibur)->result_array();

                                                        if ($td == $tgl) {

                                                            if (count($datalibur) > 0) {
                                                                echo '<td class="bg-danger">' . $datalibur[0]['keterangan'] . '</td>';
                                                            } else if ($hari == 'Sun' && $minggu == 'Aktif' || $hari == 'Sat' && $sabtu == 'Aktif') {
                                                                echo '<td class="bg-danger"></td>';
                                                            } else {
                                                                if ($absen['keterangan'] == 'h') {
                                                                    if ($absen['masuk'] == 1 && $absen['keluar'] == 1) {
                                                                        echo '<td> <i class="fa fa-check"></i></td>';
                                                                    } else {
                                                                        echo "<td><b>1/2</b></td>";
                                                                    }
                                                                } else if ($absen['keterangan'] == 's' || $absen['keterangan'] == 'a' || $absen['keterangan'] == 'i') {
                                                                    echo "<td><b>" . strtoupper($absen['keterangan']) . " </b></td>";
                                                                } else {
                                                                    echo '<td></td>';
                                                                }
                                                            }
                                                        } else {
                                                            echo '<td></td>';
                                                        }
                                                    }
                                                    //tampilan rekap absen
                                                    echo "<td>$keterangan_alpha</td>
                                                <td>$keterangan_izin</td>
                                                <td>$keterangan_sakit</td>
                                                <td>$keterangan_terlambat</td>";
                                                    $keterangan_alpha = 0;
                                                    $keterangan_sakit = 0;
                                                    $keterangan_izin = 0;
                                                    $keterangan_terlambat = 0;
                                                }
                                                ?>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>


									<?php if (isset($getnik) && $getnik != ''): ?>
										<hr>
										<h4 class="mt-4">Rincian Absen Selama Sebulan:</h4>
										<div class="table-responsive mt-3">
											<table class="table table-bordered table-striped">
												<thead>
													<tr>
														<th>Tanggal Absen</th>
														<th>Jam Absen</th>
														<th>Keterangan Absen</th>
														<th>Masuk</th>
														<th>Keluar</th>
													</tr>
												</thead>
												<tbody>
													<?php
													// ambil detail absensi guru
													$tahun = date('Y');
													$bulan = isset($_GET['bulan']) ? $_GET['bulan'] : date('m');
													$sqlDetail = "SELECT * FROM tabel_detail_absen_guru 
																  WHERE nik = '$getnik' 
																  AND tanggal_absen LIKE '%$tahun-$bulan%' 
																  ORDER BY tanggal_absen ASC";
													$detailAbsen = $this->db->query($sqlDetail)->result_array();

													if (count($detailAbsen) > 0):
														foreach ($detailAbsen as $row): ?>
															<tr>
																<td><?= $row['tanggal_absen']; ?></td>
																<td><?= $row['jam_absen']; ?></td>
																<td><?= strtoupper($row['ket_absen']); ?></td>
																<td class="text-center">
																	<?= ($row['masuk'] == 1) ? '<i class="fa fa-check text-success"></i>' : '<i class="fa fa-minus text-danger"></i>'; ?>
																</td>
																<td class="text-center">
																	<?= ($row['keluar'] == 1) ? '<i class="fa fa-check text-success"></i>' : '<i class="fa fa-minus text-danger"></i>'; ?>
																</td>
															</tr>
														<?php endforeach;
													else: ?>
														<tr>
															<td colspan="5" class="text-center">Belum ada data detail absen bulan ini</td>
														</tr>
													<?php endif; ?>
												</tbody>
											</table>
										</div>
									<?php endif; ?>






                        </div>
                    </div>
                </div>
            </div>
            <!--
            <div class="col-4">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Pengabsenan</h4>
                    </div>
                    <div class="card-body">
                        <input type="hidden" name="<?= $this->security->get_csrf_token_name(); ?>" value="<?= $this->security->get_csrf_hash() ?>" />
                        <div class="form-group">
                            <label for="">Keterangan</label>
                            <select name="keterangan" id="" class="form-control" required>
                                <option value="h">Hadir</option>
                                <option value="a">Alpha</option>
                                <option value="i">izin</option>
                                <option value="t">Terlambat</option>
                            </select>
                        </div>
                        <input type="hidden" name="url" value="<?= $_SERVER['REQUEST_URI'] ?>" id="">

                        <div class="form-group">
                            <label for="">Tanggal</label>
                            <input type="date" name="tgltahun" class="form-control" required>
                        </div>

                        <div class="form-group">
                            <label for="">Aksi</label>
                            <select name="aksi" class="form-control" id="" required>
                                <option value="baru">Baru</option>
                                <option value="edit">Edit</option>
                                <option value="hapus">Hapus</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="submit" name="klikabsen" class="btn-sm btn btn-secondary"> <i class="flaticon-381-edit"></i> Absen</button>

                        </div>
                        </form>
                    </div>
                </div>
            </div>
                                            -->
        </div>
    </div>
</div>