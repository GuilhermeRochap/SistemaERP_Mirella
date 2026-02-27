'use client';

import { useRef } from 'react';
import { Button } from './ui/button';
import { Printer, Eye, X } from 'lucide-react';
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
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
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
        <div className="flex justify-end gap-2 mt-4 print:hidden">
          <Button onClick={handlePrint} className="bg-red-600 hover:bg-red-700">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
