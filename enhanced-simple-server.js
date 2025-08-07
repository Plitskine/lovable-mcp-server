#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'fs/promises';
import { join, resolve, basename } from 'path';
import fg from 'fast-glob';

// Keep process alive
const keepAlive = setInterval(() => {}, 1000);

// Project path from command line or current directory
const projectPath = process.argv.find(arg => arg.startsWith('--project-path='))?.split('=')[1] || process.cwd();
const resolvedPath = resolve(projectPath);

console.error(`Starting Enhanced Lovable MCP server for project: ${resolvedPath}`);

// Create server
const server = new Server(
  {
    name: 'lovable-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// === TOOLS ===

// Tool: Analyze project
async function analyzeProject() {
  try {
    console.error('Analyzing project...');
    
    const packageJsonPath = join(resolvedPath, 'package.json');
    let packageInfo = null;
    
    try {
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      packageInfo = JSON.parse(packageContent);
    } catch {
      console.error('No package.json found');
    }

    const files = await fg(['**/*.{tsx,jsx,ts,js}'], {
      cwd: resolvedPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: false,
    });

    console.error(`Found ${files.length} files`);

    const analysis = {
      projectPath: resolvedPath,
      packageName: packageInfo?.name || 'Unknown',
      packageVersion: packageInfo?.version || 'Unknown',
      totalFiles: files.length,
      fileTypes: {
        tsx: files.filter(f => f.endsWith('.tsx')).length,
        jsx: files.filter(f => f.endsWith('.jsx')).length,
        ts: files.filter(f => f.endsWith('.ts')).length,
        js: files.filter(f => f.endsWith('.js')).length,
      },
      hasReact: !!(packageInfo?.dependencies?.react || packageInfo?.devDependencies?.react),
      hasTypeScript: !!(packageInfo?.dependencies?.typescript || packageInfo?.devDependencies?.typescript),
      hasVite: !!(packageInfo?.dependencies?.vite || packageInfo?.devDependencies?.vite),
      hasNext: !!(packageInfo?.dependencies?.next || packageInfo?.devDependencies?.next),
      hasTailwind: !!(packageInfo?.dependencies?.tailwindcss || packageInfo?.devDependencies?.tailwindcss),
      hasSupabase: !!(packageInfo?.dependencies?.['@supabase/supabase-js'] || packageInfo?.devDependencies?.['@supabase/supabase-js']),
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(analysis, null, 2);
  } catch (error) {
    console.error('Error in analyzeProject:', error);
    return JSON.stringify({ error: error.message }, null, 2);
  }
}

// Tool: Get components
async function getComponents() {
  try {
    console.error('Getting components...');
    
    const componentFiles = await fg(['**/*.{tsx,jsx}'], {
      cwd: resolvedPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: false,
    });

    console.error(`Found ${componentFiles.length} component files`);

    const components = [];
    for (const file of componentFiles.slice(0, 20)) {
      const fullPath = join(resolvedPath, file);
      const content = await readFile(fullPath, 'utf-8');
      
      // Basic component analysis using regex
      const hasDefaultExport = /export\s+default/.test(content);
      const hasNamedExports = /export\s+(?:const|function|class|interface|type)/.test(content);
      const hasProps = /(?:props|Props)/.test(content);
      const hasState = /(?:useState|setState|state)/.test(content);
      const hasEffects = /useEffect/.test(content);
      
      // Extract component name from filename or default export
      const componentName = basename(file, '.tsx').replace('.jsx', '');
      
      components.push({
        path: file,
        name: componentName,
        size: content.length,
        hasDefaultExport,
        hasNamedExports,
        hasJSX: content.includes('<') && content.includes('>'),
        hasProps,
        hasState,
        hasEffects,
        isComponent: /export\s+(?:default\s+)?(?:function|const|class)/.test(content),
      });
    }

    return JSON.stringify({
      totalComponents: componentFiles.length,
      analyzed: components.length,
      components,
    }, null, 2);
  } catch (error) {
    console.error('Error in getComponents:', error);
    return JSON.stringify({ error: error.message }, null, 2);
  }
}

// Tool: Get routing structure
async function getRoutingStructure() {
  try {
    console.error('Analyzing routing structure...');
    
    // Look for routing files
    const routingFiles = await fg([
      '**/router*.{ts,tsx,js,jsx}',
      '**/routes*.{ts,tsx,js,jsx}',
      '**/App.{ts,tsx,js,jsx}',
      '**/main.{ts,tsx,js,jsx}',
      '**/index.{ts,tsx,js,jsx}'
    ], {
      cwd: resolvedPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: false,
    });

    const routes = [];
    
    for (const file of routingFiles) {
      const fullPath = join(resolvedPath, file);
      const content = await readFile(fullPath, 'utf-8');
      
      // Simple pattern matching for routes
      const routePatterns = [
        /path\s*[:=]\s*["']([^"']+)["']/g,
        /route\s*[:=]\s*["']([^"']+)["']/g,
        /<Route[^>]+path\s*=\s*["']([^"']+)["']/g,
        /\{\s*path\s*:\s*["']([^"']+)["']/g,
      ];
      
      for (const pattern of routePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          routes.push({
            path: match[1],
            file: file,
            component: basename(file, '.tsx').replace('.jsx', ''),
            isProtected: /protected|private|auth/i.test(content),
          });
        }
      }
    }

    return JSON.stringify({
      routingFiles,
      routes: routes.slice(0, 20),
      totalRoutes: routes.length,
      hasReactRouter: routes.some(r => r.path.includes('/')),
    }, null, 2);
  } catch (error) {
    console.error('Error in getRoutingStructure:', error);
    return JSON.stringify({ error: error.message }, null, 2);
  }
}

// Tool: Analyze dependencies
async function analyzeDependencies() {
  try {
    console.error('Analyzing dependencies...');
    
    const packageJsonPath = join(resolvedPath, 'package.json');
    let packageInfo = null;
    
    try {
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      packageInfo = JSON.parse(packageContent);
    } catch {
      return JSON.stringify({ error: 'No package.json found' }, null, 2);
    }

    const dependencies = packageInfo.dependencies || {};
    const devDependencies = packageInfo.devDependencies || {};
    
    // Categorize dependencies
    const categories = {
      react: [],
      ui: [],
      state: [],
      routing: [],
      styling: [],
      database: [],
      build: [],
      testing: [],
      utilities: [],
      other: []
    };
    
    const categorizePackage = (name, version) => {
      const pkg = { name, version };
      if (name.includes('react') || name.includes('@types/react')) {
        categories.react.push(pkg);
      } else if (name.includes('ui') || name.includes('component') || name.includes('material') || name.includes('ant') || name.includes('chakra')) {
        categories.ui.push(pkg);
      } else if (name.includes('redux') || name.includes('zustand') || name.includes('jotai') || name.includes('recoil')) {
        categories.state.push(pkg);
      } else if (name.includes('router') || name.includes('navigation') || name.includes('reach')) {
        categories.routing.push(pkg);
      } else if (name.includes('styled') || name.includes('emotion') || name.includes('tailwind') || name.includes('css') || name.includes('sass')) {
        categories.styling.push(pkg);
      } else if (name.includes('supabase') || name.includes('prisma') || name.includes('mongoose') || name.includes('firebase')) {
        categories.database.push(pkg);
      } else if (name.includes('vite') || name.includes('webpack') || name.includes('rollup') || name.includes('babel') || name.includes('esbuild')) {
        categories.build.push(pkg);
      } else if (name.includes('test') || name.includes('jest') || name.includes('vitest') || name.includes('cypress') || name.includes('playwright')) {
        categories.testing.push(pkg);
      } else if (name.includes('lodash') || name.includes('axios') || name.includes('dayjs') || name.includes('uuid') || name.includes('clsx')) {
        categories.utilities.push(pkg);
      } else {
        categories.other.push(pkg);
      }
    };
    
    Object.entries(dependencies).forEach(([name, version]) => categorizePackage(name, version));
    Object.entries(devDependencies).forEach(([name, version]) => categorizePackage(name, version));

    return JSON.stringify({
      totalDependencies: Object.keys(dependencies).length,
      totalDevDependencies: Object.keys(devDependencies).length,
      categories,
      frameworks: {
        hasReact: !!dependencies.react,
        hasNext: !!dependencies.next,
        hasVite: !!dependencies.vite || !!devDependencies.vite,
        hasTailwind: !!dependencies.tailwindcss || !!devDependencies.tailwindcss,
        hasSupabase: !!dependencies['@supabase/supabase-js'],
        hasTypeScript: !!devDependencies.typescript || !!dependencies.typescript,
      }
    }, null, 2);
  } catch (error) {
    console.error('Error in analyzeDependencies:', error);
    return JSON.stringify({ error: error.message }, null, 2);
  }
}

// Tool: Get Tailwind usage
async function getTailwindUsage() {
  try {
    console.error('Analyzing Tailwind usage...');
    
    const sourceFiles = await fg(['**/*.{tsx,jsx,ts,js}'], {
      cwd: resolvedPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: false,
    });

    const classUsage = new Map();
    const fileUsage = [];
    
    for (const file of sourceFiles.slice(0, 50)) { // Limit for performance
      const fullPath = join(resolvedPath, file);
      const content = await readFile(fullPath, 'utf-8');
      
      // Extract className attributes and template literals
      const classMatches = [
        ...content.matchAll(/className\s*=\s*["']([^"']+)["']/g),
        ...content.matchAll(/className\s*=\s*{[^}]*["']([^"']+)["'][^}]*}/g),
        ...content.matchAll(/class\s*=\s*["']([^"']+)["']/g),
      ];
      
      const classNames = [];
      
      for (const match of classMatches) {
        const classes = match[1]?.split(/\s+/) || [];
        classNames.push(...classes);
        
        classes.forEach(cls => {
          if (cls.trim() && cls.length > 0) {
            classUsage.set(cls, (classUsage.get(cls) || 0) + 1);
          }
        });
      }
      
      if (classNames.length > 0) {
        fileUsage.push({
          file,
          uniqueClasses: [...new Set(classNames)].length,
          totalClasses: classNames.length,
          topClasses: [...new Set(classNames)].slice(0, 10),
        });
      }
    }
    
    // Get most used classes
    const sortedClasses = [...classUsage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    // Categorize common Tailwind patterns
    const patterns = {
      layout: sortedClasses.filter(([cls]) => /^(flex|grid|block|inline|hidden|w-|h-|p-|m-|space-|gap-)/.test(cls)),
      colors: sortedClasses.filter(([cls]) => /^(bg-|text-|border-|from-|to-|via-)/.test(cls)),
      typography: sortedClasses.filter(([cls]) => /^(text-|font-|leading-|tracking-|uppercase|lowercase)/.test(cls)),
      responsive: sortedClasses.filter(([cls]) => /^(sm:|md:|lg:|xl:|2xl:)/.test(cls)),
    };

    return JSON.stringify({
      totalFiles: sourceFiles.length,
      analyzedFiles: fileUsage.length,
      totalUniqueClasses: classUsage.size,
      mostUsedClasses: sortedClasses.map(([cls, count]) => ({ class: cls, count })),
      patterns: {
        layout: patterns.layout.slice(0, 10).map(([cls, count]) => ({ class: cls, count })),
        colors: patterns.colors.slice(0, 10).map(([cls, count]) => ({ class: cls, count })),
        typography: patterns.typography.slice(0, 10).map(([cls, count]) => ({ class: cls, count })),
        responsive: patterns.responsive.slice(0, 10).map(([cls, count]) => ({ class: cls, count })),
      },
      fileUsage: fileUsage.slice(0, 10),
    }, null, 2);
  } catch (error) {
    console.error('Error in getTailwindUsage:', error);
    return JSON.stringify({ error: error.message }, null, 2);
  }
}

// Tool: Analyze hooks usage
async function getHooksUsage() {
  try {
    console.error('Analyzing React hooks usage...');
    
    const sourceFiles = await fg(['**/*.{tsx,jsx,ts,js}'], {
      cwd: resolvedPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: false,
    });

    const hookUsage = new Map();
    const customHooks = [];
    const fileUsage = [];

    for (const file of sourceFiles.slice(0, 50)) {
      const fullPath = join(resolvedPath, file);
      const content = await readFile(fullPath, 'utf-8');
      
      // Built-in hooks
      const builtInHooks = [
        'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
        'useMemo', 'useRef', 'useLayoutEffect', 'useDebugValue', 'useId'
      ];
      
      const fileHooks = [];
      
      builtInHooks.forEach(hook => {
        const regex = new RegExp(`\\b${hook}\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
          fileHooks.push(hook);
          hookUsage.set(hook, (hookUsage.get(hook) || 0) + matches.length);
        }
      });
      
      // Custom hooks (functions starting with 'use')
      const customHookMatches = content.match(/\buse[A-Z][a-zA-Z0-9]*\b/g) || [];
      customHookMatches.forEach(hook => {
        if (!builtInHooks.includes(hook)) {
          customHooks.push({ hook, file });
          hookUsage.set(hook, (hookUsage.get(hook) || 0) + 1);
        }
      });
      
      if (fileHooks.length > 0 || customHookMatches.length > 0) {
        fileUsage.push({
          file,
          builtInHooks: fileHooks,
          customHooks: customHookMatches.filter(h => !builtInHooks.includes(h)),
        });
      }
    }

    const sortedHooks = [...hookUsage.entries()]
      .sort((a, b) => b[1] - a[1]);

    return JSON.stringify({
      totalFiles: sourceFiles.length,
      analyzedFiles: fileUsage.length,
      totalHooksUsage: [...hookUsage.values()].reduce((a, b) => a + b, 0),
      mostUsedHooks: sortedHooks.slice(0, 20).map(([hook, count]) => ({ hook, count })),
      customHooksFound: [...new Set(customHooks.map(ch => ch.hook))],
      fileUsage: fileUsage.slice(0, 15),
    }, null, 2);
  } catch (error) {
    console.error('Error in getHooksUsage:', error);
    return JSON.stringify({ error: error.message }, null, 2);
  }
}

// Tool: Analyze API calls
async function analyzeApiCalls() {
  try {
    console.error('Analyzing API calls...');
    
    const sourceFiles = await fg(['**/*.{tsx,jsx,ts,js}'], {
      cwd: resolvedPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: false,
    });

    const apiCalls = [];
    const patterns = {
      fetch: /fetch\s*\(\s*["']([^"']+)["']/g,
      axios: /axios\s*\.\s*(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g,
      supabase: /supabase\s*\.\s*from\s*\(\s*["']([^"']+)["']\)/g,
      endpoints: /["']\/api\/([^"']+)["']/g,
    };

    for (const file of sourceFiles.slice(0, 50)) {
      const fullPath = join(resolvedPath, file);
      const content = await readFile(fullPath, 'utf-8');
      
      // Fetch calls
      let match;
      while ((match = patterns.fetch.exec(content)) !== null) {
        apiCalls.push({
          type: 'fetch',
          url: match[1],
          file,
          method: 'GET', // Default, could be extracted from context
        });
      }
      
      // Axios calls
      while ((match = patterns.axios.exec(content)) !== null) {
        apiCalls.push({
          type: 'axios',
          method: match[1].toUpperCase(),
          url: match[2],
          file,
        });
      }
      
      // Supabase calls
      while ((match = patterns.supabase.exec(content)) !== null) {
        apiCalls.push({
          type: 'supabase',
          table: match[1],
          file,
        });
      }
      
      // API endpoints
      while ((match = patterns.endpoints.exec(content)) !== null) {
        apiCalls.push({
          type: 'api_endpoint',
          endpoint: match[1],
          file,
        });
      }
    }

    // Analyze patterns
    const apiTypes = {};
    const methods = {};
    const domains = {};
    
    apiCalls.forEach(call => {
      apiTypes[call.type] = (apiTypes[call.type] || 0) + 1;
      
      if (call.method) {
        methods[call.method] = (methods[call.method] || 0) + 1;
      }
      
      if (call.url) {
        try {
          const url = new URL(call.url);
          domains[url.hostname] = (domains[url.hostname] || 0) + 1;
        } catch {
          // Not a full URL, probably relative
          if (call.url.startsWith('/')) {
            domains['relative'] = (domains['relative'] || 0) + 1;
          }
        }
      }
    });

    return JSON.stringify({
      totalApiCalls: apiCalls.length,
      apiTypes,
      methods,
      domains,
      calls: apiCalls.slice(0, 20),
      hasSupabase: Object.keys(apiTypes).includes('supabase'),
      hasAxios: Object.keys(apiTypes).includes('axios'),
      hasFetch: Object.keys(apiTypes).includes('fetch'),
    }, null, 2);
  } catch (error) {
    console.error('Error in analyzeApiCalls:', error);
    return JSON.stringify({ error: error.message }, null, 2);
  }
}

// Tool: Analyze database schema
async function analyzeDatabaseSchema() {
  try {
    console.error('Analyzing database schema...');
    
    const schemaFiles = await fg([
      '**/schema*.{sql,ts,js}',
      '**/database*.{sql,ts,js}',
      '**/migrations/**/*.{sql,ts,js}',
      '**/supabase/**/*.{sql,ts,js}',
      '**/types/**/*database*.{ts,js}',
      '**/types/**/*supabase*.{ts,js}',
    ], {
      cwd: resolvedPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: false,
    });

    const schema = {
      tables: [],
      types: [],
      functions: [],
      policies: [],
      relationships: []
    };

    const supabaseTypes = [];
    const sqlStatements = [];

    for (const file of schemaFiles) {
      const fullPath = join(resolvedPath, file);
      const content = await readFile(fullPath, 'utf-8');
      
      // SQL table definitions
      const tableMatches = content.match(/CREATE\s+TABLE\s+(\w+)\s*\([^)]+\)/gi) || [];
      tableMatches.forEach(match => {
        const tableName = match.match(/CREATE\s+TABLE\s+(\w+)/i)?.[1];
        if (tableName) {
          schema.tables.push({
            name: tableName,
            file,
            definition: match.slice(0, 200) + '...',
          });
        }
      });

      // TypeScript interfaces for database
      const interfaceMatches = content.match(/interface\s+(\w*(?:Database|Table|Row|Insert|Update)\w*)\s*\{[^}]+\}/gi) || [];
      interfaceMatches.forEach(match => {
        const interfaceName = match.match(/interface\s+(\w+)/i)?.[1];
        if (interfaceName) {
          schema.types.push({
            name: interfaceName,
            file,
            type: 'interface',
            definition: match.slice(0, 200) + '...',
          });
        }
      });

      // Type aliases for database
      const typeMatches = content.match(/type\s+(\w*(?:Database|Table|Row|Insert|Update)\w*)\s*=[^;]+/gi) || [];
      typeMatches.forEach(match => {
        const typeName = match.match(/type\s+(\w+)/i)?.[1];
        if (typeName) {
          schema.types.push({
            name: typeName,
            file,
            type: 'type',
            definition: match.slice(0, 200) + '...',
          });
        }
      });

      // RLS Policies
      const policyMatches = content.match(/CREATE\s+POLICY\s+(\w+)\s+ON\s+(\w+)/gi) || [];
      policyMatches.forEach(match => {
        const policyMatch = match.match(/CREATE\s+POLICY\s+(\w+)\s+ON\s+(\w+)/i);
        if (policyMatch) {
          schema.policies.push({
            name: policyMatch[1],
            table: policyMatch[2],
            file,
          });
        }
      });

      // Functions/Procedures
      const functionMatches = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)/gi) || [];
      functionMatches.forEach(match => {
        const funcName = match.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)/i)?.[1];
        if (funcName) {
          schema.functions.push({
            name: funcName,
            file,
          });
        }
      });

      // Foreign key relationships (simplified)
      const foreignKeyMatches = content.match(/REFERENCES\s+(\w+)\s*\(/gi) || [];
      foreignKeyMatches.forEach(match => {
        const referencedTable = match.match(/REFERENCES\s+(\w+)/i)?.[1];
        if (referencedTable) {
          schema.relationships.push({
            referencedTable,
            file,
          });
        }
      });

      // Supabase specific patterns
      if (content.includes('supabase') || content.includes('Database')) {
        // Extract Supabase table references
        const supabaseTableRefs = content.match(/from\s*\(\s*["'](\w+)["']\s*\)/gi) || [];
        supabaseTableRefs.forEach(match => {
          const tableName = match.match(/["'](\w+)["']/)?.[1];
          if (tableName) {
            supabaseTypes.push({
              table: tableName,
              file,
              context: 'supabase_query'
            });
          }
        });
      }
    }

    // Look for Supabase client usage in hooks and components
    const codeFiles = await fg(['**/*.{tsx,jsx,ts,js}'], {
      cwd: resolvedPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      absolute: false,
    });

    const supabaseUsage = [];
    for (const file of codeFiles.slice(0, 30)) {
      const fullPath = join(resolvedPath, file);
      const content = await readFile(fullPath, 'utf-8');
      
      if (content.includes('supabase')) {
        const tableRefs = content.match(/\.from\s*\(\s*["'](\w+)["']\s*\)/g) || [];
        tableRefs.forEach(match => {
          const tableName = match.match(/["'](\w+)["']/)?.[1];
          if (tableName) {
            supabaseUsage.push({
              table: tableName,
              file,
              operation: 'query'
            });
          }
        });
      }
    }

    return JSON.stringify({
      schemaFiles,
      totalFiles: schemaFiles.length,
      schema: {
        tables: schema.tables.slice(0, 20),
        types: schema.types.slice(0, 20),
        functions: schema.functions.slice(0, 10),
        policies: schema.policies.slice(0, 10),
        relationships: schema.relationships.slice(0, 10),
      },
      supabaseUsage: supabaseUsage.slice(0, 15),
      statistics: {
        totalTables: schema.tables.length,
        totalTypes: schema.types.length,
        totalFunctions: schema.functions.length,
        totalPolicies: schema.policies.length,
        totalRelationships: schema.relationships.length,
        supabaseReferences: supabaseUsage.length,
      },
      hasSupabase: supabaseUsage.length > 0 || supabaseTypes.length > 0,
      hasSQL: schemaFiles.some(f => f.endsWith('.sql')),
      hasTypeScript: schemaFiles.some(f => f.endsWith('.ts')),
    }, null, 2);
  } catch (error) {
    console.error('Error in analyzeDatabaseSchema:', error);
    return JSON.stringify({ error: error.message }, null, 2);
  }
}

// === RESOURCES ===
async function getProjectResources() {
  const resources = [
    {
      uri: 'project://structure',
      name: 'Project Structure',
      description: 'Current project file tree and organization',
      mimeType: 'application/json',
    },
    {
      uri: 'project://package',
      name: 'Package Information',
      description: 'Package.json with dependencies and scripts',
      mimeType: 'application/json',
    },
    {
      uri: 'project://components',
      name: 'Component Inventory',
      description: 'React components with their relationships',
      mimeType: 'application/json',
    },
    {
      uri: 'project://routes',
      name: 'Routing Configuration',
      description: 'Application routing structure and parameters',
      mimeType: 'application/json',
    },
  ];
  return resources;
}

async function readProjectResource(uri) {
  const resourceId = uri.replace('project://', '');
  
  switch (resourceId) {
    case 'structure':
      const files = await fg(['**/*'], {
        cwd: resolvedPath,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        absolute: false,
      });
      return JSON.stringify({ 
        totalFiles: files.length,
        files: files.slice(0, 100),
        directories: [...new Set(files.map(f => f.split('/')[0]))].filter(d => d !== ''),
      }, null, 2);
      
    case 'package':
      const packagePath = join(resolvedPath, 'package.json');
      try {
        const content = await readFile(packagePath, 'utf-8');
        return content;
      } catch {
        return JSON.stringify({ error: 'No package.json found' }, null, 2);
      }
      
    case 'components':
      return await getComponents();
      
    case 'routes':
      return await getRoutingStructure();
      
    default:
      throw new Error(`Unknown resource: ${resourceId}`);
  }
}

// === PROMPTS ===
async function getPromptTemplates() {
  return [
    {
      name: 'code_review',
      description: 'Review React component code and suggest improvements',
      arguments: [
        {
          name: 'component_path',
          description: 'Path to the component file',
          required: true,
        },
      ],
    },
    {
      name: 'refactor_suggest',
      description: 'Suggest refactoring improvements for better code structure',
      arguments: [
        {
          name: 'file_path',
          description: 'Path to the file to refactor',
          required: true,
        },
      ],
    },
    {
      name: 'performance_audit',
      description: 'Analyze component performance and suggest optimizations',
      arguments: [
        {
          name: 'component_name',
          description: 'Name of the component to audit',
          required: true,
        },
      ],
    },
  ];
}

async function getPrompt(name, args) {
  switch (name) {
    case 'code_review':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please review the React component at ${args.component_path} and provide suggestions for improvements. Focus on:
1. Code structure and organization
2. Performance optimizations
3. Accessibility compliance
4. Best practices adherence
5. Potential bugs or issues`,
            },
          },
        ],
      };
    
    case 'refactor_suggest':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze the file at ${args.file_path} and suggest refactoring improvements. Consider:
1. Code duplication elimination
2. Function extraction opportunities
3. Better naming conventions
4. Improved error handling
5. Enhanced readability`,
            },
          },
        ],
      };
    
    case 'performance_audit':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Perform a performance audit on the component "${args.component_name}". Check for:
1. Unnecessary re-renders
2. Memory leaks
3. Bundle size impact
4. Load time optimizations
5. Runtime performance bottlenecks`,
            },
          },
        ],
      };
    
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

// === REQUEST HANDLERS ===

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('Listing tools...');
  return {
    tools: [
      {
        name: 'analyze_project',
        description: 'Analyze the Lovable project structure and configuration',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_components',
        description: 'Get React components in the project with detailed analysis',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_routing_structure',
        description: 'Analyze the application routing structure and routes',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'analyze_dependencies',
        description: 'Analyze project dependencies and categorize them by type',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_tailwind_usage',
        description: 'Analyze Tailwind CSS class usage patterns and statistics',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_hooks_usage',
        description: 'Analyze React hooks usage patterns in the codebase',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'analyze_api_calls',
        description: 'Analyze external API calls and data fetching patterns',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'analyze_database_schema',
        description: 'Analyze Supabase database schema, tables, types, and RLS policies',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.error('Listing resources...');
  const resources = await getProjectResources();
  return { resources };
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  console.error(`Reading resource: ${uri}`);
  const content = await readProjectResource(uri);
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: content,
      },
    ],
  };
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  console.error('Listing prompts...');
  const prompts = await getPromptTemplates();
  return { prompts };
});

// Get prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`Getting prompt: ${name}`);
  const prompt = await getPrompt(name, args || {});
  return prompt;
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  console.error(`Handling tool call: ${name}`);

  try {
    let result;
    
    switch (name) {
      case 'analyze_project':
        result = await analyzeProject();
        break;
      case 'get_components':
        result = await getComponents();
        break;
      case 'get_routing_structure':
        result = await getRoutingStructure();
        break;
      case 'analyze_dependencies':
        result = await analyzeDependencies();
        break;
      case 'get_tailwind_usage':
        result = await getTailwindUsage();
        break;
      case 'get_hooks_usage':
        result = await getHooksUsage();
        break;
      case 'analyze_api_calls':
        result = await analyzeApiCalls();
        break;
      case 'analyze_database_schema':
        result = await analyzeDatabaseSchema();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    console.error(`Error handling tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Handle process cleanup
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  clearInterval(keepAlive);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  clearInterval(keepAlive);
  process.exit(0);
});

// Start server
async function main() {
  try {
    console.error('Creating transport...');
    const transport = new StdioServerTransport();
    
    console.error('Connecting server...');
    await server.connect(transport);
    
    console.error(`Enhanced Lovable MCP server running for project: ${resolvedPath}`);
    console.error('Server is ready with 8 tools, resources, and prompts...');
    
  } catch (error) {
    console.error('Server error:', error);
    clearInterval(keepAlive);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Main error:', error);
  clearInterval(keepAlive);
  process.exit(1);
});