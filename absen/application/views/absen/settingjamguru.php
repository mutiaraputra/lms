<div class="content-body">
    <div class="container-fluid">
        <div class="page-titles">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="javascript:void(0)">Absen Guru</a></li>
                <li class="breadcrumb-item active"><a href="javascript:void(0)">Jam absen guru</a></li>
            </ol>
        </div>
         <?php if ($this->session->flashdata('success')): ?>
        <p style="color:green"><?= $this->session->flashdata('success') ?></p>
		<?php endif; ?>
        <!-- row -->

		<form action="<?= base_url('absen/simpan_jam_absen') ?>" method="post">
		<!-- Tambahkan ini jika csrf_protection aktif -->
		<input type="hidden" name="<?= $this->security->get_csrf_token_name(); ?>" 
           value="<?= $this->security->get_csrf_hash(); ?>" />
        <label>Pilih Guru:</label><br>
        <select name="nik" required>
            <option value="">-- Pilih Guru --</option>
            <?php foreach ($guru as $g): ?>
                <option value="<?= $g->nik ?>"><?= $g->nama_guru ?> (<?= $g->nik ?>)</option>
            <?php endforeach; ?>
        </select><br><br>

        <label>Hari:</label><br>
        <select name="hari" required>
            <option value="">-- Pilih Hari --</option>
            <option value="Senin">Senin</option>
            <option value="Selasa">Selasa</option>
            <option value="Rabu">Rabu</option>
            <option value="Kamis">Kamis</option>
            <option value="Jumat">Jumat</option>
            <option value="Sabtu">Sabtu</option>
            <option value="Minggu">Minggu</option>
        </select><br><br>

        <label>Jam Mulai:</label><br>
        <input type="time" name="mulai" required><br><br>

        <label>Jam Selesai:</label><br>
        <input type="time" name="selesai" required><br><br>

        <button type="submit">Simpan</button>
    </form>
<hr>

    <div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <h4 class="card-title">Jam Absen Guru</h4>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-responsive-md">
                        <thead>
                            <tr>
                                <th class="width80">No</th>
                                <th>NIK</th>
                                <th>Nama Guru</th>
                                <th>Hari</th>
                                <th>Mulai</th>
                                <th>Selesai</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $no = 1;
                            foreach ($jam_absen as $jam) : ?>
                                <tr>
                                    <td><?= $no++; ?></td>
                                    <td><span class="badge light badge-success"><?= $jam->nik ?></span></td>
                                    <td><?= $jam->nama_guru ?></td>
                                    <td><?= $jam->hari ?></td>
                                    <td><?= $jam->mulai ?></td>
                                    <td><?= $jam->selesai ?></td>
                                    <td>
                                        <div class="dropdown">
                                            <button type="button" class="btn btn-success light sharp" data-toggle="dropdown">
                                                <svg width="20px" height="20px" viewBox="0 0 24 24" version="1.1">
                                                    <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                                                        <rect x="0" y="0" width="24" height="24"/>
                                                        <circle fill="#000000" cx="5" cy="12" r="2"/>
                                                        <circle fill="#000000" cx="12" cy="12" r="2"/>
                                                        <circle fill="#000000" cx="19" cy="12" r="2"/>
                                                    </g>
                                                </svg>
                                            </button>
                                            <div class="dropdown-menu">
                                                 <button class="dropdown-item" data-toggle="modal" data-target="#ubah<?= $jam->id; ?>">Edit</button>
														<a href="<?= base_url('absen/hapus_jam_absen/'.$jam->id) ?>" 
														   class="dropdown-item" 
														   onclick="return confirm('Yakin hapus jam absen ini?')">Delete</a>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            <?php if (empty($jam_absen)): ?>
                                <tr>
                                    <td colspan="7" class="text-center">Belum ada data jam absen guru</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<?php foreach ($jam_absen as $jam): ?>
<div class="modal fade" id="ubah<?= $jam->id; ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <form action="<?= base_url('absen/update_jam_absen') ?>" method="post">
        <input type="hidden" name="<?= $this->security->get_csrf_token_name(); ?>" 
               value="<?= $this->security->get_csrf_hash(); ?>" />
        <input type="hidden" name="id" value="<?= $jam->id; ?>">

        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit Jam Absen</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            
            <div class="form-group">
                <label>Hari</label>
                <select name="hari" class="form-control" required>
                    <?php 
                    $hariList = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
                    foreach($hariList as $h): ?>
                        <option value="<?= $h ?>" <?= ($jam->hari == $h ? 'selected' : '') ?>><?= $h ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <label>Jam Mulai</label>
                <input type="time" name="mulai" value="<?= $jam->mulai ?>" class="form-control" required>
            </div>

            <div class="form-group">
                <label>Jam Selesai</label>
                <input type="time" name="selesai" value="<?= $jam->selesai ?>" class="form-control" required>
            </div>

          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
          </div>
        </div>
    </form>
  </div>
</div>
<?php endforeach; ?>
