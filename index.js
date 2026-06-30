let config = {};

// Prioriza as variáveis de ambiente (Railway/Nuvem) para não dar erro de token inválido
if (process.env.TOKEN) {
    config = {
        TOKEN: process.env.TOKEN,
        CLIENT_ID: process.env.CLIENT_ID,
        ID_CATEGORIA_RECRUTAMENTO: process.env.ID_CATEGORIA_RECRUTAMENTO,
        ID_CANAL_LOGS_STAFF: process.env.ID_CANAL_LOGS_STAFF
    };
} else {
    // Caso contrário, roda localmente usando o arquivo do seu computador
    try {
        config = require('./config.json');
    } catch (e) {
        console.error("❌ Não foi possível carregar o arquivo config.json localmente.");
    }
}

const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ChannelType, 
    PermissionFlagsBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// IDs configurados por você
const CARGO_RESPONSAVEL_REC = "1520205210742558890";
const CARGOS_APROVADO = ["1520282795728048159", "1520204010991128596", "1520203968754483241"];
const CARGO_REPROVADO = "1521284852010450984";
const LINK_IMAGEM_PAINEL = "https://media.discordapp.net/attachments/1518280073210494986/1521277609944809532/image.png?ex=6a45912e&is=6a443fae&hm=dd97b30760654140fb6fa74b84fd6f65b083f3a78b24dfb0b58946d9a2101546&=&format=webp&quality=lossless&width=1280&height=699";

// Configuração das perguntas e tempos (em milissegundos)
const perguntasEdital = [
    { num: "1/10", texto: "Qual seu nome [in game/vida real]", tempo: 4 * 60 * 1000 },
    { num: "2/10", texto: "Quantos anos você tem?", tempo: 4 * 60 * 1000 },
    { num: "3/10", texto: "Você joga na city a quanto tempo?", tempo: 4 * 60 * 1000 },
    { num: "4/10", texto: "Oque e RDM? Site uma situação.", tempo: 4 * 60 * 1000 },
    { num: "5/10", texto: "Oque e VDM? Site uma situação.", tempo: 4 * 60 * 1000 },
    { num: "6/10", texto: "Oque e CL? Site uma situação.", tempo: 4 * 60 * 1000 },
    { num: "7/10", texto: "Oque e RK? Site uma situação.", tempo: 4 * 60 * 1000 },
    { num: "8/10", texto: "Oque e PG? Site uma situação.", tempo: 4 * 60 * 1000 },
    { num: "9/10", texto: "Oque e DARK RP? Site uma situação.", tempo: 4 * 60 * 1000 },
    { num: "10/10", texto: "Crie um texto de 5 linhas falando o por que quer entrar para a nossa corporação!.", tempo: 10 * 60 * 1000 }
];

client.once('ready', async () => {
    console.log(`🚓 Bot da Polícia Federal online como ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('enviar-painel')
            .setDescription('Envia o painel moderno de recrutamento da PF.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(config.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
        console.log('✅ Comando /enviar-painel registrado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    
    // 1. Comando de barra para enviar o Painel Moderno
    if (interaction.isChatInputCommand() && interaction.commandName === 'enviar-painel') {
        const embedPainel = new EmbedBuilder()
            .setTitle('🚔 DEPARTAMENTO DE POLÍCIA FEDERAL')
            .setDescription(
                '### 📋 Concurso Público - Admissão Corporativa\n\n' +
                '• Responda a todas as questões de forma clara, objetiva e dentro da legalidade.\n' +
                '• Suas respostas passarão por uma triagem rigorosa feita pelo comando e responsáveis.\n' +
                '• Atente-se ao tempo estipulado em cada uma das etapas do edital.\n\n' +
                'ℹ️ **Instruções:** Clique no botão abaixo para abrir o seu canal de edital privado.'
            )
            .setColor('#102542')
            .setImage(LINK_IMAGEM_PAINEL)
            .setFooter({ text: 'Diretoria de Recrutamento e Seleção • PF', iconURL: interaction.guild.iconURL() });

        const botao = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('iniciar_edital_pf')
                .setLabel('Iniciar Edital')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embedPainel], components: [botao] });
        return;
    }

    // 2. Lógica ao clicar em "Iniciar Edital"
    if (interaction.isButton() && interaction.customId === 'iniciar_edital_pf') {
        const guild = interaction.guild;
        const usuario = interaction.user;

        const canalExistente = guild.channels.cache.find(c => c.name === `edital-${usuario.username.toLowerCase()}`);
        if (canalExistente) {
            return interaction.reply({ content: `❌ Você já tem um edital aberto: ${canalExistente}`, ephemeral: true });
        }

        await interaction.reply({ content: '⏳ Processando sua solicitação de admissão...', ephemeral: true });

        const canalEdital = await guild.channels.create({
            name: `edital-${usuario.username}`,
            type: ChannelType.GuildText,
            parent: config.ID_CATEGORIA_RECRUTAMENTO,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: usuario.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        await interaction.editReply({ content: `✅ Seu edital foi iniciado com sucesso em: ${canalEdital}` });

        let indice = 0;
        const respostas = [];

        // Função interna para conduzir as perguntas sequenciais
        const fazerPergunta = async () => {
            if (indice >= perguntasEdital.length) {
                // Fim das perguntas
                await canalEdital.send('⚙️ **Formulário finalizado! Suas respostas foram enviadas para a banca examinadora. Este canal será fechado em segundos...**');
                
                const canalLogs = guild.channels.cache.get(config.ID_CANAL_LOGS_STAFF);
                if (canalLogs) {
                    const embedLogs = new EmbedBuilder()
                        .setTitle(`📥 Novo Edital Respondido - Polícia Federal`)
                        .setDescription(`**Candidato:** ${usuario} (${usuario.id})`)
                        .setColor('#102542')
                        .setThumbnail(usuario.displayAvatarURL())
                        .setTimestamp();

                    respostas.forEach(r => {
                        embedLogs.addFields({ name: `📌 Pergunta ${r.num}: ${r.pergunta}`, value: `\`\`\`\n${r.resposta}\n\`\`\``, inline: false });
                    });

                    // Botões de decisão para a staff
                    const botoesStaff = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`pf_aprovar_${usuario.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success).setEmoji('✅'),
                        new ButtonBuilder().setCustomId(`pf_reprovar_${usuario.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger).setEmoji('❌')
                    );

                    await canalLogs.send({ embeds: [embedLogs], components: [botoesStaff] });
                }

                setTimeout(() => canalEdital.delete().catch(() => {}), 10000);
                return;
            }

            const dadosPergunta = perguntasEdital[indice];
            const minutos = dadosPergunta.tempo / 60 / 1000;

            const embedPergunta = new EmbedBuilder()
                .setTitle(`🚔 Pergunta ${dadosPergunta.num}`)
                .setDescription(`### ${dadosPergunta.texto}\n\n⚠️ *Você tem **${minutos} minutos** para responder. Caso o tempo acabe, o recrutamento fecha automaticamente!*`)
                .setColor('#ffd700')
                .setTimestamp();

            await canalEdital.send({ embeds: [embedPergunta] });

            // Coletor de mensagens focado na resposta do candidato
            const filtro = m => m.author.id === usuario.id;
            const coletor = canalEdital.createMessageCollector({ filter: filtro, max: 1, time: dadosPergunta.tempo });

            coletor.on('collect', async (msg) => {
                // Guarda a resposta informada
                respostas.push({ num: dadosPergunta.num, pergunta: dadosPergunta.texto, resposta: msg.content });
                
                // Apaga a mensagem digitada pelo player imediatamente para limpar o chat
                await msg.delete().catch(() => {});
                
                indice++;
                fazerPergunta();
            });

            coletor.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    await canalEdital.send('⏰ **Tempo limite esgotado! Seu edital foi cancelado por falta de resposta.**');
                    setTimeout(() => canalEdital.delete().catch(() => {}), 5000);
                }
            });
        };

        // Inicia o questionário
        await fazerPergunta();
        return;
    }

    // 3. Sistema de Decisão da Staff (Aprovar / Reprovar)
    if (interaction.isButton() && (interaction.customId.startsWith('pf_aprovar_') || interaction.customId.startsWith('pf_reprovar_'))) {
        
        // Verifica se quem clicou possui o cargo de responsável pelo recrutamento
        if (!interaction.member.roles.cache.has(CARGO_RESPONSAVEL_REC)) {
            return interaction.reply({ content: '❌ Você não tem permissão para avaliar este edital (Cargo de Responsável Recrutamento exigido).', ephemeral: true });
        }

        const acao = interaction.customId.startsWith('pf_aprovar_') ? 'aprovar' : 'reprovar';
        const usuarioId = interaction.customId.split('_')[2];
        
        // Tenta buscar o membro no servidor para aplicar os cargos
        let membro;
        try {
            membro = await interaction.guild.members.fetch(usuarioId);
        } catch {
            return interaction.reply({ content: '❌ Não foi possível encontrar esse usuário no servidor. Ele pode ter saído.', ephemeral: true });
        }

        const embedAtualizado = EmbedBuilder.from(interaction.message.embeds[0]);

        if (acao === 'aprovar') {
            // Adiciona todos os cargos de aprovação solicitados
            for (const cargoId of CARGOS_APROVADO) {
                if (!membro.roles.cache.has(cargoId)) {
                    await membro.roles.add(cargoId).catch(err => console.log(`Erro ao adicionar cargo ${cargoId}:`, err));
                }
            }

            // Envia mensagem no privado do player aprovado
            try {
                await membro.send(`# _📣Aviso oficial! Felizmente você foi aprovado!!! Parabéns!! Seja bem vindo ao mundo da policia! Fico feliz por ter aprovado! agora so mandar mensagem esperando seu sett in game\n\n_Ass:@${client.user.username} !!_`);
            } catch {
                console.log(`Não foi possível enviar mensagem privada para ${membro.user.tag} (DM fechada).`);
            }

            embedAtualizado.setColor('#00ff00').setTitle(`✅ Edital APROVADO por ${interaction.user.tag}`);
            await interaction.update({ embeds: [embedAtualizado], components: [] });

        } else if (acao === 'reprovar') {
            // Adiciona o cargo de reprovado solicitado
            if (!membro.roles.cache.has(CARGO_REPROVADO)) {
                await membro.roles.add(CARGO_REPROVADO).catch(err => console.log(`Erro ao adicionar cargo reprovado:`, err));
            }

            // Envia mensagem no privado do player reprovado
            try {
                await membro.send(`# 📣Aviso oficial! Infelizmente você foi reprovado!, mais não desista! Leie as regras, melhore nas respostas! Eu confio em você!!.`);
            } catch {
                console.log(`Não foi possível enviar mensagem privada para ${membro.user.tag} (DM fechada).`);
            }

            embedAtualizado.setColor('#ff0000').setTitle(`❌ Edital REPROVADO por ${interaction.user.tag}`);
            await interaction.update({ embeds: [embedAtualizado], components: [] });
        }
    }
});

client.login(config.TOKEN);