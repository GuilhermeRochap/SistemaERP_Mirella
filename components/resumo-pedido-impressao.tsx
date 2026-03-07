'use client';

import { useRef } from 'react';
import { Button } from './ui/button';
import { Printer, Eye, MessageSquare, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

interface PedidoParaImpressao {
  id: string;
  nomeRecebedor: string;
  telefone: string;
  endereco: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  dataEntrega: string;
  horaEntrega: string;
  descricao: string;
  origemPedido?: string;
  formaPagamento?: string;
  valorTotalCompra?: number;
  valorFretePago?: number;
  pedidoAnonimo?: boolean;
  mensagemAnonima?: string;
  nomeComprador?: string;
  telefoneComprador?: string;
  createdAt: string;
}

interface Props {
  pedido: PedidoParaImpressao;
  nomeEmpresa?: string;
}

export function ResumoPedidoImpressao({ pedido, nomeEmpresa = 'Mirella Doces' }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido #${pedido.id.slice(0, 8)}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
              font-weight: bold;
              line-height: 1.4;
              padding: 8px;
              width: 80mm;
              background: white;
              color: black;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .empresa {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .pedido-num {
              font-size: 14px;
              margin-bottom: 2px;
            }
            .data {
              font-size: 10px;
            }
            .section {
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px dashed #000;
            }
            .section-title {
              font-weight: bold;
              font-size: 11px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .field {
              margin-bottom: 2px;
            }
            .field-label {
              font-weight: bold;
            }
            .anonimo-msg {
              text-align: center;
              padding: 8px;
              border: 1px solid #000;
              margin: 8px 0;
              font-style: italic;
            }
            .total-section {
              margin-top: 8px;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .total-final {
              font-size: 16px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 4px;
              margin-top: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 12px;
              font-size: 10px;
            }
            @media print {
              body { width: 100%; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handlePrintA6 = () => {
    const mensagem = pedido.mensagemAnonima?.trim() || (pedido.pedidoAnonimo ? 'Este presente foi enviado anonimamente.' : '');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSvg = `<svg viewBox="0 0 120 140" width="72" height="84" xmlns="http://www.w3.org/2000/svg">
      <path d="M48 38 Q44 22 36 20 Q42 28 40 38 Z" fill="#5a9e3a"/>
      <path d="M60 32 Q60 14 54 12 Q56 24 58 34 Z" fill="#5a9e3a"/>
      <path d="M72 38 Q76 22 84 20 Q78 28 80 38 Z" fill="#5a9e3a"/>
      <path d="M38 48 Q30 60 30 78 Q30 105 60 118 Q90 105 90 78 Q90 60 82 48 Q72 44 60 44 Q48 44 38 48 Z" fill="#c0392b" stroke="#a93226" stroke-width="1.5"/>
      <ellipse cx="50" cy="65" rx="2.5" ry="3" fill="#f5b7b1" transform="rotate(-10 50 65)"/>
      <ellipse cx="70" cy="65" rx="2.5" ry="3" fill="#f5b7b1" transform="rotate(10 70 65)"/>
      <ellipse cx="45" cy="82" rx="2.5" ry="3" fill="#f5b7b1" transform="rotate(-8 45 82)"/>
      <ellipse cx="60" cy="80" rx="2.5" ry="3" fill="#f5b7b1"/>
      <ellipse cx="75" cy="82" rx="2.5" ry="3" fill="#f5b7b1" transform="rotate(8 75 82)"/>
      <ellipse cx="52" cy="97" rx="2.5" ry="3" fill="#f5b7b1" transform="rotate(-5 52 97)"/>
      <ellipse cx="68" cy="97" rx="2.5" ry="3" fill="#f5b7b1" transform="rotate(5 68 97)"/>
      <path d="M44 95 L44 73 Q44 68 50 68 Q56 68 57 74 Q58 68 64 68 Q70 68 70 74 L70 95" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Cartao - ${pedido.nomeRecebedor}</title>
      <meta charset="utf-8"/>
      <style>
        @page { size: A6 portrait; margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          width:105mm; height:148mm;
          background:white;
          font-family: Georgia,'Times New Roman',serif;
          color:#333;
          display:flex; flex-direction:column;
          align-items:center; justify-content:space-between;
          padding:14mm 12mm 12mm 12mm;
        }
        .mensagem { font-size:15px; line-height:1.75; font-style:italic; text-align:center; white-space:pre-wrap; }
        .para { font-size:13px; color:#999; font-style:italic; margin-bottom:10px; }
        .nome { font-size:28px; color:#c0392b; font-style:italic; font-weight:bold; letter-spacing:1px; }
      </style>
    </head><body>
      <div style="text-align:center">${logoSvg}</div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8mm 0;width:100%">
        ${pedido.nomeRecebedor ? `<p class="para">Para: ${pedido.nomeRecebedor}</p>` : ''}
        ${mensagem ? `<p class="mensagem">&ldquo;${mensagem}&rdquo;</p>` : '<p style="color:#bbb;font-style:italic">(sem mensagem)</p>'}
      </div>
      <div style="text-align:center"><span class="nome">Mirella Doces</span></div>
    </body></html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const formatarValor = (valor?: number) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const enderecoCompleto = [
    pedido.endereco,
    pedido.numero,
    pedido.complemento,
    pedido.bairro,
    `${pedido.cidade}/${pedido.estado}`,
    `CEP: ${pedido.cep}`,
  ].filter(Boolean).join(', ');

  const subtotal = (pedido.valorTotalCompra ?? 0) - (pedido.valorFretePago ?? 0);

  const handlePrintEtiqueta = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta - Pedido #${pedido.id.slice(0, 8)}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 8px;
              width: 80mm;
              background: white;
              color: black;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .empresa {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .pedido-num {
              font-size: 18px;
              font-weight: bold;
            }
            .destinatario-title {
              font-size: 12px;
              text-transform: uppercase;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .destinatario {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 12px;
              line-height: 1.1;
            }
            .endereco-box {
              border: 2px solid #000;
              padding: 8px;
              border-radius: 4px;
              margin-bottom: 12px;
            }
            .endereco-title {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
              margin-bottom: 6px;
            }
            .endereco-text {
              font-size: 18px;
              font-weight: bold;
              line-height: 1.3;
            }
            .info-row {
              font-size: 16px;
              margin-bottom: 6px;
              font-weight: bold;
            }
            .label {
              font-size: 12px;
              text-transform: uppercase;
              color: #333;
              display: block;
              margin-bottom: 2px;
            }
            @media print {
              body { width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="empresa">${nomeEmpresa}</div>
            <div class="pedido-num">PEDIDO #${pedido.id.slice(0, 8).toUpperCase()}</div>
          </div>
          
          <div class="destinatario-title">Recebedor:</div>
          <div class="destinatario">${pedido.nomeRecebedor}</div>

          <div class="endereco-box">
            <div class="endereco-title">Endereço de Entrega</div>
            <div class="endereco-text">
              ${pedido.endereco}${pedido.numero ? `, ${pedido.numero}` : ''}<br>
              ${pedido.complemento ? `Comp: ${pedido.complemento}<br>` : ''}
              Bairro: ${pedido.bairro}<br>
              ${pedido.cidade} - ${pedido.estado}
            </div>
          </div>

          <div class="info-row">
            <span class="label">Telefone:</span>
            ${pedido.telefone}
          </div>
          
          <div class="info-row">
            <span class="label">Data de Entrega:</span>
            ${formatarData(pedido.dataEntrega)} às ${pedido.horaEntrega}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const renderConteudo = () => (
    <div ref={printRef}>
      {/* Cabeçalho */}
      <div className="header">
        <div className="empresa">{nomeEmpresa}</div>
        <div className="pedido-num">Pedido #{pedido.id.slice(0, 8).toUpperCase()}</div>
        <div className="data">{formatarDataHora(pedido.createdAt)}</div>
      </div>

      {/* Dados do Cliente/Recebedor */}
      <div className="section">
        <div className="section-title">Dados da Entrega</div>

        {pedido.pedidoAnonimo ? (
          <>
            <div className="anonimo-msg">
              🎁 Pedido enviado anonimamente
              {pedido.mensagemAnonima ? (
                <div style={{ marginTop: '8px' }}>&quot;{pedido.mensagemAnonima}&quot;</div>
              ) : (
                <div style={{ marginTop: '8px' }}>&quot;Este presente foi enviado anonimamente.&quot;</div>
              )}
            </div>
            <div className="field">
              <span className="field-label">Recebedor:</span> {pedido.nomeRecebedor}
            </div>
            <div className="field">
              <span className="field-label">Tel:</span> {pedido.telefone}
            </div>
          </>
        ) : (
          <>
            {pedido.nomeComprador && (
              <div className="field">
                <span className="field-label">Cliente:</span> {pedido.nomeComprador}
              </div>
            )}
            {pedido.telefoneComprador && (
              <div className="field">
                <span className="field-label">Tel Cliente:</span> {pedido.telefoneComprador}
              </div>
            )}
            <div className="field">
              <span className="field-label">Recebedor:</span> {pedido.nomeRecebedor}
            </div>
            <div className="field">
              <span className="field-label">Tel:</span> {pedido.telefone}
            </div>
          </>
        )}
      </div>

      {/* Endereço */}
      <div className="section">
        <div className="section-title">Endereço</div>
        <div className="field">{enderecoCompleto}</div>
      </div>

      {/* Data e Hora de Entrega */}
      <div className="section">
        <div className="section-title">Entrega</div>
        <div className="field">
          <span className="field-label">Data:</span> {formatarData(pedido.dataEntrega)}
        </div>
        <div className="field">
          <span className="field-label">Horário:</span> {pedido.horaEntrega}
        </div>
        {pedido.origemPedido && (
          <div className="field">
            <span className="field-label">Origem:</span> {pedido.origemPedido}
          </div>
        )}
        {pedido.formaPagamento && (
          <div className="field">
            <span className="field-label">Pagamento:</span> {pedido.formaPagamento}
          </div>
        )}
      </div>

      {/* Itens/Descrição */}
      <div className="section">
        <div className="section-title">Itens do Pedido</div>
        <div className="field" style={{ whiteSpace: 'pre-wrap' }}>{pedido.descricao}</div>
      </div>

      {/* Valores */}
      <div className="total-section">
        {subtotal > 0 && (
          <div className="total-line">
            <span>Subtotal:</span>
            <span>{formatarValor(subtotal)}</span>
          </div>
        )}
        {pedido.valorFretePago && pedido.valorFretePago > 0 && (
          <div className="total-line">
            <span>Frete:</span>
            <span>{formatarValor(pedido.valorFretePago)}</span>
          </div>
        )}
        {pedido.valorTotalCompra && pedido.valorTotalCompra > 0 && (
          <div className="total-line total-final">
            <span>TOTAL:</span>
            <span>{formatarValor(pedido.valorTotalCompra)}</span>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="footer">
        <div>Obrigado pela preferência!</div>
        <div>{nomeEmpresa}</div>
      </div>
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Resumo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Pré-visualização do Resumo
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="bg-white text-black p-4 rounded border font-mono text-xs leading-relaxed" style={{ maxWidth: '80mm', margin: '0 auto' }}>
          {renderConteudo()}
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col gap-3 mt-4 print:hidden">
          <Button onClick={handlePrintEtiqueta} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            <MapPin className="w-4 h-4 mr-2" />
            Imprimir Etiqueta de Envio
          </Button>
          <div className="flex justify-between items-center gap-2">
            <Button variant="outline" onClick={handlePrintA6} className="flex-1 border-red-300 text-red-700 hover:bg-red-50">
              <MessageSquare className="w-4 h-4 mr-2" />
              Cartão A6
            </Button>
            <Button onClick={handlePrint} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Resumo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
