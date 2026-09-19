<div class="content-body">
    <!-- row -->




    <div class="container-fluid">
        <div class="page-titles">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="javascript:void(0)">Guru</a></li>
                <li class="breadcrumb-item active"><a href="javascript:void(0)">Data Guru</a></li>
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

            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Data Guru </h4>
                        <a href="<?= base_url(); ?>guru/sinkronisasi" class="btn-sm btn btn-secondary  tambahkelas    shadow"> <i class="flaticon-381-add-2"></i> Sinkronkan</a>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table id="example" class="display min-w850">
                                <thead>
                                    <tr>
                                        <th>No</th>
                                        <th>NIK</th>
                                        <th>Nama</th>
                                        <th>Jenis Kelamin</th>
                                        <th>Alamat</th>
                                        <th>Tanggal Lahir</th>
                                        <th>Nomor HP</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php $i = 1; ?>
                                    <?php foreach ($guru as $s) : ?>
                                        <tr>
                                            <td><?= $i++ ?></td>
                                            <td><?= $s['nik']; ?></td>
                                            <td><?= $s['nama_guru']; ?></td>
                                            <td><?= $s['jenis_kelamin']; ?></td>
                                            <td><?= $s['alamat']; ?></td>
                                            <td><?= $s['tgl_lahir']; ?></td>
                                            <td><?= $s['no_telepon']; ?></td>

                                            <td>
                                                <div class="d-flex">
                                                    <form action="<?= base_url() ?>guru/delete" method="POST">
                                                        <input type="hidden" name="<?= $this->security->get_csrf_token_name(); ?>" value="<?= $this->security->get_csrf_hash() ?>">
                                                        <input type="hidden" name="id_guru" value="<?= $s['nik'] ?>">
                                                        <button class="btn btn-danger shadow btn-xs sharp"><i class="fa fa-trash"></i></button>
                                                    </form>
                                                    <form action="<?= base_url() ?>guru/kartuguru" method="POST">
                                                        <input type="hidden" name="<?= $this->security->get_csrf_token_name(); ?>" value="<?= $this->security->get_csrf_hash() ?>">
                                                        <input type="hidden" name="nik" value="<?= $s['nik'] ?>">
                                                        <input type="hidden" name="nama" value="<?= $s['nama_guru'] ?>">
                                                        <button class="btn btn-success shadow btn-xs sharp"><i class="fa fa-address-card"></i></button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>

                                    <?php endforeach; ?>
                                </tbody>

                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>