'use client';

import { useRef } from 'react';
import { Button } from './ui/button';
import { Printer, Eye, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';

interface Props {
    mensagem?: string;
    nomeRecebedor: string;
    pedidoAnonimo?: boolean;
}

export function CartaoMensagemA6({ mensagem, nomeRecebedor, pedidoAnonimo }: Props) {
    const printRef = useRef<HTMLDivElement>(null);

    const mensagemFinal = mensagem?.trim() || (pedidoAnonimo ? 'Este presente foi enviado anonimamente.' : '');

    // Converte a imagem PNG para base64 para embutir na janela de impressão
    const handlePrint = async () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        // Carrega a logo como base64 para funcionar na janela de impressão
        let logoBase64 = '';
        try {
            const resp = await fetch('/logo_mirella.png');
            const blob = await resp.blob();
            logoBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch {
            // fallback: usa src direto (pode não funcionar offline)
            logoBase64 = '/logo_mirella.png';
        }

        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Cartão - ${nomeRecebedor}</title>
  <meta charset="utf-8"/>
  <style>
    @page { size: A6 portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 105mm;
      height: 148mm;
      background: white;
      font-family: Georgia, 'Times New Roman', serif;
      color: #333;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 10mm 10mm 10mm 10mm;
    }
    .logo-area { text-align: center; width: 100%; }
    .logo-area img { max-width: 75mm; height: auto; display: block; margin: 0 auto; }
    .mensagem-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 6mm 0;
      width: 100%;
    }
    .para { font-size: 11px; color: #aaa; font-style: italic; margin-bottom: 8px; }
    .mensagem { font-size: 14px; line-height: 1.7; color: #333; font-style: italic; white-space: pre-wrap; }
    .vazio { font-size: 11px; color: #ccc; font-style: italic; }
    .rodape { font-size: 9px; color: #bbb; text-align: center; }
  </style>
</head>
<body>
  <div class="logo-area"><img src="${logoBase64}" alt="Mirella Doces"/></div>
  <div class="mensagem-area">
    ${nomeRecebedor ? `<p class="para">Para: ${nomeRecebedor}</p>` : ''}
    ${mensagemFinal
                ? `<p class="mensagem">&ldquo;${mensagemFinal}&rdquo;</p>`
                : `<p class="vazio">(sem mensagem)</p>`
            }
  </div>
  <div class="rodape">com carinho ♥</div>
</body>
</html>`);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Cartão A6
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Cartão de Mensagem — A6
                    </DialogTitle>
                </DialogHeader>

                {/* Preview em escala */}
                <div
                    className="bg-white rounded-lg border-2 border-gray-200 shadow-sm mx-auto"
                    style={{
                        width: '210px',
                        height: '297px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 14px 12px',
                    }}
                >
                    {/* Logo no topo */}
                    <div style={{ width: '100%', textAlign: 'center' }}>
                        <Image
                            src="/logo_mirella.png"
                            alt="Mirella Doces"
                            width={180}
                            height={77}
                            style={{ margin: '0 auto', height: 'auto' }}
                            priority
                        />
                    </div>

                    {/* Mensagem Central */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '8px 0',
                        width: '100%',
                    }}>
                        {nomeRecebedor && (
                            <p style={{ fontSize: '8px', color: '#aaa', marginBottom: '5px', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
                                Para: {nomeRecebedor}
                            </p>
                        )}
                        {mensagemFinal ? (
                            <p style={{ fontSize: '9px', lineHeight: '1.6', color: '#444', fontStyle: 'italic', fontFamily: 'Georgia, serif', whiteSpace: 'pre-wrap' }}>
                                &ldquo;{mensagemFinal}&rdquo;
                            </p>
                        ) : (
                            <p style={{ fontSize: '8px', color: '#ccc', fontStyle: 'italic' }}>(sem mensagem)</p>
                        )}
                    </div>

                    {/* Rodapé */}
                    <p style={{ fontSize: '7px', color: '#ccc', fontFamily: 'Georgia, serif' }}>com carinho ♥</p>
                </div>

                {/* Botão Imprimir */}
                <div className="flex justify-end mt-3">
                    <Button onClick={handlePrint} className="bg-red-600 hover:bg-red-700">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir Cartão
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
