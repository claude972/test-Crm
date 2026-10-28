resource "kubernetes_persistent_volume_claim" "server" {
  metadata {
    name      = "${var.kovaa-labcrm_app_name}-server-pvc"
    namespace = kubernetes_namespace.kovaa-labcrm.metadata.0.name
  }
  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = var.kovaa-labcrm_server_pvc_requests
      }
    }
    volume_name = kubernetes_persistent_volume.server.metadata.0.name
  }
}
