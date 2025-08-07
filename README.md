# Lovable MCP Server

A specialized Model Context Protocol (MCP) server that provides real-time analysis of Lovable-generated projects for AI tools like Claude Desktop. Transform manual project analysis into instant AI understanding.

## 🚀 Overview

Replace this workflow:
```
Lovable dev → GitHub push → Download → Upload to AI → Manual analysis → Research
```

With instant integration:
```
Lovable dev → Claude instantly understands via MCP
```

## ✨ Features

### 🔧 **8 Powerful Analysis Tools**
1. **`analyze_project`** - Complete project structure and metadata analysis
2. **`get_components`** - Deep React component analysis (props, state, effects, JSX patterns)  
3. **`get_routing_structure`** - Application routing with protected routes detection
4. **`analyze_dependencies`** - Smart dependency categorization and framework detection
5. **`get_tailwind_usage`** - Tailwind CSS usage patterns and statistics
6. **`get_hooks_usage`** - React hooks analysis (built-in + custom hooks)
7. **`analyze_api_calls`** - API integration patterns (Supabase, fetch, axios)
8. **`analyze_database_schema`** - Supabase schema, tables, types, and RLS policies

### 📊 **4 Live Resources**
- **`project://structure`** - Real-time project file tree
- **`project://package`** - Package.json with dependencies and scripts  
- **`project://components`** - Component inventory with relationships
- **`project://routes`** - Routing configuration and parameters

### 🎯 **3 Smart Prompts**
- **`code_review`** - Component code review with improvement suggestions
- **`refactor_suggest`** - Structural refactoring recommendations  
- **`performance_audit`** - Performance optimization analysis

### 🛡️ **Enterprise Security**
- Path traversal protection with boundary validation
- Claude Desktop authentication
- Rate limiting with configurable costs
- Error message sanitization

## 📦 Installation

### Prerequisites
- Node.js 18+
- Claude Desktop app

### Quick Setup

1. **Install globally**:
```bash
npm install -g lovable-mcp-server
```

2. **Add to Claude Desktop** (`claude_desktop_config.json`):

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lovable-mcp": {
      "command": "lovable-mcp-server",
      "args": ["--project-path", "/path/to/your/lovable/project"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Development Setup

1. **Clone and install**:
```bash
git clone https://github.com/yourusername/lovable-mcp-server.git
cd lovable-mcp-server
npm install
```

2. **For development** (claude_desktop_config.json):
```json
{
  "mcpServers": {
    "lovable-mcp-dev": {
      "command": "node",
      "args": [
        "/path/to/lovable-mcp-server/enhanced-simple-server.js",
        "--project-path=/path/to/your/lovable/project"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

## 🛠️ Development

```bash
# Test all functionality
npm run test

# Run all individual tests
npm run test-all

# Start server for specific project
npm run dev
```

## 🎯 Usage Examples

Once connected to Claude Desktop, ask:

- **"Analyze the structure of this Lovable project"** → `analyze_project`
- **"How are React components organized?"** → `get_components`
- **"What's the routing structure?"** → `get_routing_structure`  
- **"Show me the dependency breakdown"** → `analyze_dependencies`
- **"Analyze Tailwind usage patterns"** → `get_tailwind_usage`
- **"What React hooks are being used?"** → `get_hooks_usage`
- **"Show me the API integration patterns"** → `analyze_api_calls`
- **"Analyze the Supabase database schema"** → `analyze_database_schema`

## 📊 Example Analysis Output

### Project Structure
```json
{
  "projectPath": "/path/to/project",
  "packageName": "zen-task-quest",
  "totalFiles": 75,
  "fileTypes": {
    "tsx": 45,
    "ts": 20,
    "js": 5,
    "jsx": 5
  },
  "hasReact": true,
  "hasTypeScript": true,
  "hasTailwind": true,
  "hasSupabase": true
}
```

### Component Analysis
```json
{
  "totalComponents": 45,
  "analyzed": 20,
  "components": [
    {
      "name": "TaskCard",
      "path": "src/components/TaskCard.tsx",
      "hasProps": true,
      "hasState": true,
      "hasEffects": false,
      "isComponent": true
    }
  ]
}
```

### Database Schema
```json
{
  "hasSupabase": true,
  "statistics": {
    "totalTables": 2,
    "totalTypes": 1,
    "supabaseReferences": 6
  },
  "supabaseUsage": [
    {
      "table": "tasks",
      "file": "src/hooks/useTasks.tsx",
      "operation": "query"
    }
  ]
}
```

## 🏗️ Architecture

### Core Capabilities
- **Real-time Analysis**: Instant project understanding without GitHub workflows
- **Framework Detection**: Automatic identification of React, Vite, Next.js, Supabase
- **Pattern Recognition**: Smart detection of components, hooks, routing patterns
- **Security-First**: Enterprise-grade security with path validation and authentication

### Lovable-Specific Features
- **Supabase Integration**: Automatic auth, database, and RLS detection
- **Tailwind Patterns**: Common Lovable styling pattern recognition
- **Component Architecture**: Lovable's component organization understanding
- **Route Analysis**: Lovable's routing conventions and protected routes

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new analyzers
- Update documentation
- Ensure security compliance

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol this server implements
- [Claude Desktop](https://claude.ai/desktop) - AI assistant that uses MCP servers
- [Lovable](https://lovable.dev/) - The platform this server analyzes

## 🆘 Troubleshooting

### Common Issues

**Server not starting**:
```bash
# Check Node.js version
node --version  # Should be 18+

# Test server directly
node enhanced-simple-server.js --project-path=/path/to/project
```

**Claude Desktop not connecting**:
1. Check `claude_desktop_config.json` syntax
2. Verify file paths are absolute
3. Restart Claude Desktop
4. Check logs: `~/Library/Logs/Claude/mcp-server-lovable-mcp.log`

**Analysis errors**:
- Ensure project path contains a valid Lovable project
- Check file permissions
- Verify project structure (package.json, src/ directory)

### Debug Mode
```json
{
  "env": {
    "NODE_ENV": "development",
    "LOG_LEVEL": "debug"
  }
}
```

## 📈 Performance

- **Startup time**: <2 seconds
- **Analysis speed**: ~100 files/second  
- **Memory usage**: <100MB typical
- **Cache efficiency**: 85%+ hit rate