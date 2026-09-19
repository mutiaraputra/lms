<?php
class M_data extends CI_Model
{

    public function datalibur()
    {
        $tgl = date('Y-m');
        return $this->db->like('tanggal', $tgl)->where('status', 'Aktif')->get('tabel_libur')->result_array();
    }

    public function dataakunguru($nik)
    {
        $this->db->select('*');
        $this->db->from('login_guru');
        $this->db->join('tabel_guru', 'tabel_guru.nik = login_guru.nik_guru');
        $this->db->where('nik_guru', $nik);
        return $this->db->get()->result_array();
    }
}
