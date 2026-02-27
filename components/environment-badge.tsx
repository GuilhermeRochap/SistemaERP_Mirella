'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, Server, TestTube, Rocket } from 'lucide-react';

interface EnvironmentInfo {
  environment: 'development' | 'production' | 'test';
  databaseHost: string;
  lalamoveEnv: string;
  logLevel: string;
}

export function EnvironmentBadge() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);

  useEffect(() => {
    fetch('/api/environment')
      .then(res => res.json())
      .then(data => setEnvInfo(data))
      .catch(() => setEnvInfo(null));
  }, []);

  if (!envInfo) return null;

  const isDev = envInfo.environment === 'development';
  const isTest = envInfo.environment === 'test';
  const isProd = envInfo.environment === 'production';

  const badgeConfig = {
    development: {
      label: 'DEV',
      className: 'bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600',
      icon: TestTube,
      description: 'Ambiente de Desenvolvimento',
    },
    test: {
      label: 'TEST',
      className: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600',
      icon: TestTube,
      description: 'Ambiente de Teste',
    },
    production: {
      label: 'PROD',
      className: 'bg-red-700 hover:bg-red-800 text-white border-red-800 animate-pulse',
      icon: Rocket,
      description: 'Ambiente de Produção',
    },
  };

  const config = badgeConfig[envInfo.environment] || badgeConfig.development;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${config.className} cursor-help font-bold text-xs px-2 py-1 flex items-center gap-1`}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <p className="font-semibold flex items-center gap-2">
              <Server className="w-4 h-4" />
              {config.description}
            </p>
            <div className="border-t pt-2 space-y-1 text-xs">
              <p className="flex items-center gap-2">
                <Database className="w-3 h-3" />
                <span className="text-muted-foreground">Banco:</span>
                <span className="font-mono">{envInfo.databaseHost}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Lalamove:</span>
                <span className={`ml-1 font-semibold ${envInfo.lalamoveEnv === 'production' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {envInfo.lalamoveEnv === 'production' ? 'LIVE' : 'SANDBOX'}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Logs:</span>
                <span className="ml-1">{envInfo.logLevel}</span>
              </p>
            </div>
            {isProd && (
              <p className="text-red-400 text-xs font-semibold border-t pt-2">
                ⚠️ Cuidado: Dados reais de produção!
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
