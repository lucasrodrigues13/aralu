import { Component, ElementRef, OnDestroy, OnInit, output, signal, viewChild } from '@angular/core';
import jsQR from 'jsqr';

/** Lê QR codes pela câmera do navegador e emite o texto lido (SPEC-058). Sem câmera ou sem permissão, avisa. */
@Component({
  selector: 'app-leitor-qr',
  template: `
    <div class="leitor">
      <video #video playsinline muted aria-label="Câmera para ler o QR code"></video>
      <canvas #quadro hidden></canvas>
    </div>
    @if (erro(); as mensagem) {
      <p class="text-error text-sm" role="alert">{{ mensagem }}</p>
    } @else {
      <p class="text-muted text-sm">Aponte a câmera para o QR code do convite.</p>
    }
  `,
  styles: `
    .leitor { position: relative; width: 100%; aspect-ratio: 1; max-height: 60vh; background: #000; border-radius: 8px; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: cover; }
  `,
})
export class LeitorQrComponent implements OnInit, OnDestroy {
  readonly lido = output<string>();
  protected readonly erro = signal<string | null>(null);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly quadro = viewChild.required<ElementRef<HTMLCanvasElement>>('quadro');
  private fluxo: MediaStream | null = null;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private ultimo = '';
  private ultimoEm = 0;

  async ngOnInit(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.erro.set('Este navegador não deixa usar a câmera. Escolha o convite na lista.');
      return;
    }
    try {
      this.fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch {
      this.erro.set('Não foi possível abrir a câmera. Permita o acesso à câmera ou escolha o convite na lista.');
      return;
    }
    const elemento = this.video().nativeElement;
    elemento.srcObject = this.fluxo;
    await elemento.play().catch(() => undefined);
    this.temporizador = setInterval(() => this.ler(), 250);
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.fluxo?.getTracks().forEach((faixa) => faixa.stop());
  }

  private ler(): void {
    const video = this.video().nativeElement;
    if (video.readyState < video.HAVE_ENOUGH_DATA || !video.videoWidth) return;
    const canvas = this.quadro().nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexto = canvas.getContext('2d', { willReadFrequently: true });
    if (!contexto) return;
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imagem = contexto.getImageData(0, 0, canvas.width, canvas.height);
    const codigo = jsQR(imagem.data, imagem.width, imagem.height, { inversionAttempts: 'dontInvert' });
    if (!codigo?.data) return;
    // Não repete a mesma leitura enquanto o QR continua na frente da câmera.
    const agora = Date.now();
    if (codigo.data === this.ultimo && agora - this.ultimoEm < 3000) {
      this.ultimoEm = agora;
      return;
    }
    this.ultimo = codigo.data;
    this.ultimoEm = agora;
    this.lido.emit(codigo.data);
  }
}
