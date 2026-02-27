'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, MapPin, Building2, Save, Loader2, Server, Database, Truck, FileText, TestTube, Rocket, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface EnvironmentInfo {
  environment: 'development' | 'production' | 'test';
  databaseHost: string;
  lalamoveEnv: string;
  logLevel: string;
}

interface Configuracao {
  id: string;
  nomeEmpresa: string;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  telefone: string | null;
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);

  useEffect(() => {
    carregarConfiguracao();
    carregarEnvironment();
  }, []);

  const carregarEnvironment = async () => {
    try {
      const response = await fetch('/api/environment');
      if (response.ok) {
        const data = await response.json();
        setEnvInfo(data);
      }
    } catch (error) {
      console.error('Erro ao carregar informações do ambiente:', error);
    }
  };

  const carregarConfiguracao = async () => {
    try {
      const response = await fetch('/api/configuracao');
      if (response?.ok) {
        const data = await response?.json?.();
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep?.replace?.(/\D/g, '') ?? '';
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response?.json?.();

      if (data && !data?.erro) {
        setConfig(prev => prev ? {
          ...prev,
          endereco: data?.logradouro ?? prev?.endereco,
          bairro: data?.bairro ?? prev?.bairro,
          cidade: data?.localidade ?? prev?.cidade,
          estado: data?.uf ?? prev?.estado,
        } : null);
        toast.success('Endereço encontrado!');
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleChange = (field: keyof Configuracao, value: string) => {
    setConfig(prev => prev ? { ...prev, [field]: value } : null);
  };

  const formatarCep = (value: string) => {
    const numeros = value?.replace?.(/\D/g, '') ?? '';
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
  };

  const formatarTelefone = (value: string) => {
    const numeros = value?.replace?.(/\D/g, '') ?? '';
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const salvarConfiguracao = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/configuracao', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response?.ok) {
        const updatedConfig = await response?.json?.();
        setConfig(updatedConfig);
        
        if (updatedConfig?.latitude && updatedConfig?.longitude) {
          toast.success('Configurações salvas! Coordenadas obtidas automaticamente.');
        } else if (config?.endereco) {
          toast.success('Configurações salvas! (Coordenadas não puderam ser obtidas)');
        } else {
          toast.success('Configurações salvas com sucesso!');
        }
      } else {
        toast.error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r text-red-600 dark:text-red-500">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Configure o endereço de origem das entregas
        </p>
      </div>

      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-500" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>
            Informações básicas da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
              <Input
                id="nomeEmpresa"
                value={config?.nomeEmpresa ?? ''}
                onChange={(e) => handleChange('nomeEmpresa', e?.target?.value ?? '')}
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formatarTelefone(config?.telefone ?? '')}
                onChange={(e) => handleChange('telefone', e?.target?.value ?? '')}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço de Origem */}
      <Card className="border-2 border-red-200">
        <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            Endereço de Origem das Entregas
          </CardTitle>
          <CardDescription>
            Este é o endereço de onde saem os pedidos para entrega. É usado para calcular as rotas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* CEP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cep">CEP</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  value={formatarCep(config?.cep ?? '')}
                  onChange={(e) => {
                    const valor = e?.target?.value ?? '';
                    handleChange('cep', valor);
                    if (valor?.replace?.(/\D/g, '')?.length === 8) {
                      buscarCep(valor);
                    }
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {buscandoCep && <Loader2 className="w-5 h-5 animate-spin text-red-500 mt-2" />}
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={config?.endereco ?? ''}
                onChange={(e) => handleChange('endereco', e?.target?.value ?? '')}
                placeholder="Rua, Avenida..."
              />
            </div>
            <div>
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={config?.numero ?? ''}
                onChange={(e) => handleChange('numero', e?.target?.value ?? '')}
                placeholder="123"
              />
            </div>
          </div>

          {/* Complemento e Bairro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={config?.complemento ?? ''}
                onChange={(e) => handleChange('complemento', e?.target?.value ?? '')}
                placeholder="Apto, Sala, Bloco..."
              />
            </div>
            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={config?.bairro ?? ''}
                onChange={(e) => handleChange('bairro', e?.target?.value ?? '')}
                placeholder="Bairro"
              />
            </div>
          </div>

          {/* Cidade e Estado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={config?.cidade ?? ''}
                onChange={(e) => handleChange('cidade', e?.target?.value ?? '')}
                placeholder="Cidade"
              />
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                value={config?.estado ?? ''}
                onChange={(e) => handleChange('estado', e?.target?.value ?? '')}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          {/* Coordenadas */}
          <div className={`p-4 rounded-lg ${config?.latitude && config?.longitude ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : 'bg-muted'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Coordenadas</p>
              {config?.latitude && config?.longitude ? (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 px-2 py-1 rounded-full">
                  ✓ Configurado
                </span>
              ) : (
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 px-2 py-1 rounded-full">
                  Será obtido ao salvar
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={config?.latitude ?? ''}
                  onChange={(e) => handleChange('latitude', e?.target?.value ?? '')}
                  placeholder="-23.550520"
                  className={config?.latitude ? 'bg-card' : ''}
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={config?.longitude ?? ''}
                  onChange={(e) => handleChange('longitude', e?.target?.value ?? '')}
                  placeholder="-46.633309"
                  className={config?.longitude ? 'bg-card' : ''}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              As coordenadas são <strong>obrigatórias</strong> para cotação de entregas. Ao salvar, o sistema obtém automaticamente pelo endereço.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card de Informações do Ambiente */}
      {envInfo && (
        <Card className={`border-2 ${envInfo.environment === 'production' ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10' : 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {envInfo.environment === 'production' ? (
                <Rocket className="w-5 h-5 text-red-500" />
              ) : (
                <TestTube className="w-5 h-5 text-yellow-500" />
              )}
              Informações do Ambiente
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${
                envInfo.environment === 'production' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-yellow-500 text-black'
              }`}>
                {envInfo.environment === 'production' ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}
              </span>
            </CardTitle>
            <CardDescription>
              {envInfo.environment === 'production' 
                ? 'Você está no ambiente de produção. Todas as alterações afetam dados reais.'
                : 'Você está no ambiente de desenvolvimento/teste.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Banco de Dados */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                <Database className={`w-8 h-8 ${envInfo.environment === 'production' ? 'text-red-500' : 'text-yellow-500'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Banco de Dados</p>
                  <p className="font-mono text-sm font-medium truncate" title={envInfo.databaseHost}>
                    {envInfo.databaseHost}
                  </p>
                </div>
              </div>

              {/* Lalamove */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                <Truck className={`w-8 h-8 ${envInfo.lalamoveEnv === 'production' ? 'text-red-500' : 'text-yellow-500'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Lalamove API</p>
                  <p className={`text-sm font-bold ${envInfo.lalamoveEnv === 'production' ? 'text-red-500' : 'text-yellow-600'}`}>
                    {envInfo.lalamoveEnv === 'production' ? '🔴 LIVE (Real)' : '🟡 SANDBOX (Teste)'}
                  </p>
                </div>
              </div>

              {/* Logs */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Nível de Log</p>
                  <p className="text-sm font-medium uppercase">{envInfo.logLevel}</p>
                </div>
              </div>
            </div>

            {envInfo.environment === 'production' && (
              <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 rounded-lg text-red-700 dark:text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm">
                  <strong>Atenção:</strong> Alterações neste ambiente afetam dados reais de clientes e pedidos. 
                  Tome cuidado ao fazer modificações.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={salvarConfiguracao}
          disabled={saving}
          size="lg"
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-pink-600 hover:to-purple-600"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
