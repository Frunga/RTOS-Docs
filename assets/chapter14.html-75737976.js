import{_ as n,o as t,c as s,e as a}from"./app-a3aa5aa8.js";const e={},i=a(`<h1 id="第14章-事件组-event-group" tabindex="-1"><a class="header-anchor" href="#第14章-事件组-event-group" aria-hidden="true">#</a> 第14章 事件组(event group)</h1><p>学校组织秋游，组长在等待：</p><ul><li>张三：我到了</li><li>李四：我到了</li><li>王五：我到了</li><li>组长说：好，大家都到齐了，出发！</li></ul><p>秋游回来第二天就要提交一篇心得报告，组长在焦急等待：张三、李四、王五谁先写好就交谁的。</p><p>在这个日常生活场景中：</p><ul><li>出发：要等待这3个人都到齐，他们是&quot;与&quot;的关系</li><li>交报告：只需等待这3人中的任何一个，他们是&quot;或&quot;的关系</li></ul><p>在FreeRTOS中，可以使用事件组(event group)来解决这些问题。</p><p>本章涉及如下内容：</p><ul><li>事件组的概念与操作函数</li><li>事件组的优缺点</li><li>怎么设置、等待、清除事件组中的位</li><li>使用事件组来同步多个任务</li></ul><h2 id="_14-1-事件组概念与操作" tabindex="-1"><a class="header-anchor" href="#_14-1-事件组概念与操作" aria-hidden="true">#</a> 14.1 事件组概念与操作</h2><h3 id="_14-1-1-事件组的概念" tabindex="-1"><a class="header-anchor" href="#_14-1-1-事件组的概念" aria-hidden="true">#</a> 14.1.1 事件组的概念</h3><p>事件组可以简单地认为就是一个整数：</p><ul><li>的每一位表示一个事件</li><li>每一位事件的含义由程序员决定，比如：Bit0表示用来串口是否就绪，Bit1表示按键是否被按下</li><li>这些位，值为1表示事件发生了，值为0表示事件没发生</li><li>一个或多个任务、ISR都可以去写这些位；一个或多个任务、ISR都可以去读这些位</li><li>可以等待某一位、某些位中的任意一个，也可以等待多位</li></ul><p><img src="http://photos.100ask.net/rtos-docs/FreeRTOS/DShanMCU-F103/chapter-14/image1.png" alt=""></p><p>事件组用一个整数来表示，其中的高8位留给内核使用，只能用其他的位来表示事件。那么这个整数是多少位的？</p><ul><li>如果configUSE_16_BIT_TICKS是1，那么这个整数就是16位的，低8位用来表示事件</li><li>如果configUSE_16_BIT_TICKS是0，那么这个整数就是32位的，低24位用来表示事件</li><li>configUSE_16_BIT_TICKS是用来表示Tick Count的，怎么会影响事件组？这只是基于效率来考虑 <ul><li>如果configUSE_16_BIT_TICKS是1，就表示该处理器使用16位更高效，所以事件组也使用16位</li><li>如果configUSE_16_BIT_TICKS是0，就表示该处理器使用32位更高效，所以事件组也使用32位</li></ul></li></ul><h3 id="_14-1-2-事件组的操作" tabindex="-1"><a class="header-anchor" href="#_14-1-2-事件组的操作" aria-hidden="true">#</a> 14.1.2 事件组的操作</h3><p>事件组和队列、信号量等不太一样，主要集中在2个地方：</p><ul><li>唤醒谁？ <ul><li>队列、信号量：事件发生时，只会唤醒一个任务</li><li>事件组：事件发生时，会唤醒所有符号条件的任务，简单地说它有&quot;广播&quot;的作用</li></ul></li><li>是否清除事件？ <ul><li>队列、信号量：是消耗型的资源，队列的数据被读走就没了；信号量被获取后就减少了</li><li>事件组：被唤醒的任务有两个选择，可以让事件保留不动，也可以清除事件</li></ul></li></ul><p>以上图为列，事件组的常规操作如下：</p><ul><li>先创建事件组</li><li>任务C、D等待事件： <ul><li>等待什么事件？可以等待某一位、某些位中的任意一个，也可以等待多位。简单地说就是&quot;或&quot;、&quot;与&quot;的关系。</li><li>得到事件时，要不要清除？可选择清除、不清除。</li></ul></li><li>任务A、B产生事件：设置事件组里的某一位、某些位</li></ul><h2 id="_14-2-事件组函数" tabindex="-1"><a class="header-anchor" href="#_14-2-事件组函数" aria-hidden="true">#</a> 14.2 事件组函数</h2><h3 id="_14-2-1-创建" tabindex="-1"><a class="header-anchor" href="#_14-2-1-创建" aria-hidden="true">#</a> 14.2.1 创建</h3><p>使用事件组之前，要先创建，得到一个句柄；使用事件组时，要使用句柄来表明使用哪个事件组。</p><p>有两种创建方法：动态分配内存、静态分配内存。函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/* 创建一个事件组，返回它的句柄。
 * 此函数内部会分配事件组结构体 
 * 返回值: 返回句柄，非NULL表示成功
 */</span>
EventGroupHandle_t <span class="token function">xEventGroupCreate</span><span class="token punctuation">(</span> <span class="token keyword">void</span> <span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">/* 创建一个事件组，返回它的句柄。
 * 此函数无需动态分配内存，所以需要先有一个StaticEventGroup_t结构体，并传入它的指针
 * 返回值: 返回句柄，非NULL表示成功
 */</span>
EventGroupHandle_t <span class="token function">xEventGroupCreateStatic</span><span class="token punctuation">(</span> StaticEventGroup_t <span class="token operator">*</span> pxEventGroupBuffer <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_14-2-2-删除" tabindex="-1"><a class="header-anchor" href="#_14-2-2-删除" aria-hidden="true">#</a> 14.2.2 删除</h3><p>对于动态创建的事件组，不再需要它们时，可以删除它们以回收内存。</p><p><strong>vEventGroupDelete</strong>可以用来删除事件组，函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/*
 * xEventGroup: 事件组句柄，你要删除哪个事件组
 */</span>
<span class="token keyword">void</span> <span class="token function">vEventGroupDelete</span><span class="token punctuation">(</span> EventGroupHandle_t xEventGroup <span class="token punctuation">)</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_14-2-3-设置事件" tabindex="-1"><a class="header-anchor" href="#_14-2-3-设置事件" aria-hidden="true">#</a> 14.2.3 设置事件</h3><p>可以设置事件组的某个位、某些位，使用的函数有2个：</p><ul><li>在任务中使用<strong>xEventGroupSetBits()</strong></li><li>在ISR中使用<strong>xEventGroupSetBitsFromISR()</strong></li></ul><p>有一个或多个任务在等待事件，如果这些事件符合这些任务的期望，那么任务还会被唤醒。</p><p>函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token comment">/* 设置事件组中的位
 * xEventGroup: 哪个事件组
 * uxBitsToSet: 设置哪些位? 
 *              如果uxBitsToSet的bitX, bitY为1, 那么事件组中的bitX, bitY被设置为1
 *              可以用来设置多个位，比如 0x15 就表示设置bit4, bit2, bit0
 * 返回值: 返回原来的事件值(没什么意义, 因为很可能已经被其他任务修改了)
 */</span>
EventBits_t <span class="token function">xEventGroupSetBits</span><span class="token punctuation">(</span> EventGroupHandle_t xEventGroup<span class="token punctuation">,</span>
                                    <span class="token keyword">const</span> EventBits_t uxBitsToSet <span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token comment">/* 设置事件组中的位
 * xEventGroup: 哪个事件组
 * uxBitsToSet: 设置哪些位? 
 *              如果uxBitsToSet的bitX, bitY为1, 那么事件组中的bitX, bitY被设置为1
 *              可以用来设置多个位，比如 0x15 就表示设置bit4, bit2, bit0
 * pxHigherPriorityTaskWoken: 有没有导致更高优先级的任务进入就绪态? pdTRUE-有, pdFALSE-没有
 * 返回值: pdPASS-成功, pdFALSE-失败
 */</span>
BaseType_t <span class="token function">xEventGroupSetBitsFromISR</span><span class="token punctuation">(</span> EventGroupHandle_t xEventGroup<span class="token punctuation">,</span>
									  <span class="token keyword">const</span> EventBits_t uxBitsToSet<span class="token punctuation">,</span>
									  BaseType_t <span class="token operator">*</span> pxHigherPriorityTaskWoken <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>值得注意的是，ISR中的函数，比如队列函数<strong>xQueueSendToBackFromISR</strong>、信号量函数<strong>xSemaphoreGiveFromISR</strong>，它们会唤醒某个任务，最多只会唤醒1个任务。</p><p>但是设置事件组时，有可能导致多个任务被唤醒，这会带来很大的不确定性。所以<strong>xEventGroupSetBitsFromISR</strong>函数不是直接去设置事件组，而是给一个FreeRTOS后台任务(daemon task)发送队列数据，由这个任务来设置事件组。</p><p>如果后台任务的优先级比当前被中断的任务优先级高，<strong>xEventGroupSetBitsFromISR</strong>会设置<strong>pxHigherPriorityTaskWoken</strong>为pdTRUE。</p><p>如果daemon task成功地把队列数据发送给了后台任务，那么<strong>xEventGroupSetBitsFromISR</strong>的返回值就是pdPASS。</p><h3 id="_14-2-4-等待事件" tabindex="-1"><a class="header-anchor" href="#_14-2-4-等待事件" aria-hidden="true">#</a> 14.2.4 等待事件</h3><p>使用<strong>xEventGroupWaitBits</strong>来等待事件，可以等待某一位、某些位中的任意一个，也可以等待多位；等到期望的事件后，还可以清除某些位。</p><p>函数原型如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code>EventBits_t <span class="token function">xEventGroupWaitBits</span><span class="token punctuation">(</span> EventGroupHandle_t xEventGroup<span class="token punctuation">,</span>
                                 <span class="token keyword">const</span> EventBits_t uxBitsToWaitFor<span class="token punctuation">,</span>
                                 <span class="token keyword">const</span> BaseType_t xClearOnExit<span class="token punctuation">,</span>
                                 <span class="token keyword">const</span> BaseType_t xWaitForAllBits<span class="token punctuation">,</span>
                                 TickType_t xTicksToWait <span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>先引入一个概念：unblock condition。一个任务在等待事件发生时，它处于阻塞状态；当期望的时间发生时，这个状态就叫&quot;unblock condition&quot;，非阻塞条件，或称为&quot;非阻塞条件成立&quot;；当&quot;非阻塞条件成立&quot;后，该任务就可以变为就绪态。</p><p>函数参数说明列表如下：</p><table><thead><tr><th style="text-align:center;"><strong>参数</strong></th><th style="text-align:left;"><strong>说明</strong></th></tr></thead><tbody><tr><td style="text-align:center;">xEventGroup</td><td style="text-align:left;">等待哪个事件组？</td></tr><tr><td style="text-align:center;">uxBitsToWaitFor</td><td style="text-align:left;">等待哪些位？哪些位要被测试？</td></tr><tr><td style="text-align:center;">xWaitForAllBits</td><td style="text-align:left;">怎么测试？是&quot;AND&quot;还是&quot;OR&quot;？ pdTRUE: 等待的位，全部为1; pdFALSE: 等待的位，某一个为1即可</td></tr><tr><td style="text-align:center;">xClearOnExit</td><td style="text-align:left;">函数提出前是否要清除事件？ pdTRUE: 清除uxBitsToWaitFor指定的位 pdFALSE: 不清除</td></tr><tr><td style="text-align:center;">xTicksToWait</td><td style="text-align:left;">如果期待的事件未发生，阻塞多久。 可以设置为0：判断后即刻返回； 可设置为portMAX_DELAY：一定等到成功才返回； 可以设置为期望的Tick Count，一般用*pdMS_TO_TICKS()*把ms转换为Tick Count</td></tr><tr><td style="text-align:center;">返回值</td><td style="text-align:left;">返回的是事件值， 如果期待的事件发生了，返回的是&quot;非阻塞条件成立&quot;时的事件值； 如果是超时退出，返回的是超时时刻的事件值。</td></tr></tbody></table><p>举例如下：</p><table><thead><tr><th style="text-align:center;">事件组的值</th><th style="text-align:center;">uxBitsToWaitFor</th><th style="text-align:center;">xWaitForAllBits</th><th style="text-align:left;">说明</th></tr></thead><tbody><tr><td style="text-align:center;">0100</td><td style="text-align:center;">0101</td><td style="text-align:center;">pdTRUE</td><td style="text-align:left;">任务期望bit0,bit2都为1， 当前值只有bit2满足，任务进入阻塞态； 当事件组中bit0,bit2都为1时退出阻塞态</td></tr><tr><td style="text-align:center;">0100</td><td style="text-align:center;">0110</td><td style="text-align:center;">pdFALSE</td><td style="text-align:left;">任务期望bit0,bit2某一个为1， 当前值满足，所以任务成功退出</td></tr><tr><td style="text-align:center;">0100</td><td style="text-align:center;">0110</td><td style="text-align:center;">pdTRUE</td><td style="text-align:left;">任务期望bit1,bit2都为1， 当前值不满足，任务进入阻塞态； 当事件组中bit1,bit2都为1时退出阻塞态</td></tr></tbody></table><p>你可以使用*xEventGroupWaitBits()<em>等待期望的事件，它发生之后再使用</em>xEventGroupClearBits()*来清除。但是这两个函数之间，有可能被其他任务或中断抢占，它们可能会修改事件组。</p><p>可以使用设置<em>xClearOnExit</em>为pdTRUE，使得对事件组的测试、清零都在*xEventGroupWaitBits()*函数内部完成，这是一个原子操作。</p><h3 id="_14-2-5-同步点" tabindex="-1"><a class="header-anchor" href="#_14-2-5-同步点" aria-hidden="true">#</a> 14.2.5 同步点</h3><p>有一个事情需要多个任务协同，比如：</p><ul><li>任务A：炒菜</li><li>任务B：买酒</li><li>任务C：摆台</li><li>A、B、C做好自己的事后，还要等别人做完；大家一起做完，才可开饭</li></ul><p>使用 <strong>xEventGroupSync()</strong> 函数可以同步多个任务：</p><ul><li>可以设置某位、某些位，表示自己做了什么事</li><li>可以等待某位、某些位，表示要等等其他任务</li><li>期望的时间发生后， <strong>xEventGroupSync()</strong> 才会成功返回。</li><li><strong>xEventGroupSync</strong>成功返回后，会清除事件</li></ul><p><strong>xEventGroupSync</strong> 函数原型如下：</p><div class="language-text line-numbers-mode" data-ext="text"><pre class="language-text"><code>EventBits_t xEventGroupSync(    EventGroupHandle_t xEventGroup,
                                const EventBits_t uxBitsToSet,
                                const EventBits_t uxBitsToWaitFor,
                                TickType_t xTicksToWait );
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>参数列表如下：</p><table><thead><tr><th style="text-align:center;"><strong>参数</strong></th><th><strong>说明</strong></th></tr></thead><tbody><tr><td style="text-align:center;">xEventGroup</td><td>哪个事件组？</td></tr><tr><td style="text-align:center;">uxBitsToSet</td><td>要设置哪些事件？我完成了哪些事件？ 比如0x05(二进制为0101)会导致事件组的bit0,bit2被设置为1</td></tr><tr><td style="text-align:center;">uxBitsToWaitFor</td><td>等待那个位、哪些位？ 比如0x15(二级制10101)，表示要等待bit0,bit2,bit4都为1</td></tr><tr><td style="text-align:center;">xTicksToWait</td><td>如果期待的事件未发生，阻塞多久。 可以设置为0：判断后即刻返回； 可设置为portMAX_DELAY：一定等到成功才返回； 可以设置为期望的Tick Count，一般用*pdMS_TO_TICKS()*把ms转换为Tick Count</td></tr><tr><td style="text-align:center;">返回值</td><td>返回的是事件值， 如果期待的事件发生了，返回的是&quot;非阻塞条件成立&quot;时的事件值； 如果是超时退出，返回的是超时时刻的事件值。</td></tr></tbody></table><p>参数列表如下：</p><table><thead><tr><th style="text-align:center;"><strong>参数</strong></th><th style="text-align:left;"><strong>说明</strong></th></tr></thead><tbody><tr><td style="text-align:center;">xEventGroup</td><td style="text-align:left;">哪个事件组？</td></tr><tr><td style="text-align:center;">uxBitsToSet</td><td style="text-align:left;">要设置哪些事件？我完成了哪些事件？ 比如0x05(二进制为0101)会导致事件组的bit0,bit2被设置为1</td></tr><tr><td style="text-align:center;">uxBitsToWaitFor</td><td style="text-align:left;">等待那个位、哪些位？ 比如0x15(二级制10101)，表示要等待bit0,bit2,bit4都为1</td></tr><tr><td style="text-align:center;">xTicksToWait</td><td style="text-align:left;">如果期待的事件未发生，阻塞多久。 可以设置为0：判断后即刻返回； 可设置为portMAX_DELAY：一定等到成功才返回； 可以设置为期望的Tick Count，一般用*pdMS_TO_TICKS()*把ms转换为Tick Count</td></tr><tr><td style="text-align:center;">返回值</td><td style="text-align:left;">返回的是事件值， 如果期待的事件发生了，返回的是&quot;非阻塞条件成立&quot;时的事件值； 如果是超时退出，返回的是超时时刻的事件值。</td></tr></tbody></table><h2 id="_14-3-示例-广播" tabindex="-1"><a class="header-anchor" href="#_14-3-示例-广播" aria-hidden="true">#</a> 14.3 示例: 广播</h2><p>本节代码为：23_eventgroup_broadcast，主要看nwatch\\game2.c。</p><p>car1运行到终点后，会设置bit0事件；car2、car3都等待bit0事件。car1设置bit0事件时，会通知到car2、car3，这就是一个广播作用。</p><p>创建事件组，代码如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token number">265</span> <span class="token keyword">void</span> <span class="token function">car_game</span><span class="token punctuation">(</span><span class="token keyword">void</span><span class="token punctuation">)</span>

<span class="token number">266</span> <span class="token punctuation">{</span>

<span class="token number">267</span>	<span class="token keyword">int</span> x<span class="token punctuation">;</span>

<span class="token number">268</span>	<span class="token keyword">int</span> i<span class="token punctuation">,</span> j<span class="token punctuation">;</span>

<span class="token number">269</span>	g_framebuffer <span class="token operator">=</span> <span class="token function">LCD_GetFrameBuffer</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>g_xres<span class="token punctuation">,</span> <span class="token operator">&amp;</span>g_yres<span class="token punctuation">,</span> <span class="token operator">&amp;</span>g_bpp<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token number">270</span>	<span class="token function">draw_init</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token number">271</span>	<span class="token function">draw_end</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token number">272</span>	

<span class="token number">273</span>	<span class="token comment">//g_xSemTicks = xSemaphoreCreateCounting(1, 1);</span>

<span class="token number">274</span>	<span class="token comment">//g_xSemTicks = xSemaphoreCreateMutex();</span>

<span class="token number">275</span>	g_xEventCar <span class="token operator">=</span> <span class="token function">xEventGroupCreate</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>第275行，创建了一个事件组。</p><p>car2等待事件，代码如下（car3的代码是一样的）：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token number">165</span>  <span class="token comment">/* 等待事件:bit0 */</span>

<span class="token number">166</span>   <span class="token function">xEventGroupWaitBits</span><span class="token punctuation">(</span>g_xEventCar<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token number">1</span><span class="token operator">&lt;&lt;</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">,</span> pdTRUE<span class="token punctuation">,</span> pdFALSE<span class="token punctuation">,</span> portMAX_DELAY<span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>car1运行到终点后，设置事件，代码如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token number">139</span>  <span class="token comment">/* 设置事件组: bit0 */</span>

<span class="token number">140</span>  <span class="token function">xEventGroupSetBits</span><span class="token punctuation">(</span>g_xEventCar<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token number">1</span><span class="token operator">&lt;&lt;</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token number">141</span>   <span class="token function">vTaskDelete</span><span class="token punctuation">(</span><span class="token constant">NULL</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>实验现象：car1运行到终点后，car2、car3同时启动。</p><h2 id="_14-4-示例-等待任意一个事件" tabindex="-1"><a class="header-anchor" href="#_14-4-示例-等待任意一个事件" aria-hidden="true">#</a> 14.4 示例: 等待任意一个事件</h2><p>本节代码为：24_eventgroup_or，主要看nwatch\\game2.c。</p><p>使用遥控器控制car1、car2。car1运行到终点后，会设置bit0事件；car2运行到终点后，会设置bit1事件；car3等待bit0、bit1的任意一个事件</p><p>car1运行到终点后，设置事件，代码如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token number">139</span>  	<span class="token comment">/* 设置事件组: bit0 */</span>

<span class="token number">140</span>		<span class="token function">xEventGroupSetBits</span><span class="token punctuation">(</span>g_xEventCar<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token number">1</span><span class="token operator">&lt;&lt;</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token number">141</span>		<span class="token function">vTaskDelete</span><span class="token punctuation">(</span><span class="token constant">NULL</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>car2运行到终点后，设置事件，代码如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token number">199</span> 	<span class="token comment">/* 设置事件组: bit1 */</span>

<span class="token number">200</span>		<span class="token function">xEventGroupSetBits</span><span class="token punctuation">(</span>g_xEventCar<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token number">1</span><span class="token operator">&lt;&lt;</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>car3等待bit0、bit1事件，实验“或”的关系（倒数第2个参数），代码如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token number">228</span>  <span class="token comment">/* 等待事件:bit0 or bit1 */</span>

<span class="token number">229</span>  <span class="token function">xEventGroupWaitBits</span><span class="token punctuation">(</span>g_xEventCar<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token number">1</span><span class="token operator">&lt;&lt;</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token operator">|</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token operator">&lt;&lt;</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">,</span> pdTRUE<span class="token punctuation">,</span> pdFALSE<span class="token punctuation">,</span> portMAX_DELAY<span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>实验现象：实验遥控器的1、2控制car1、car2，它们任何一个到了终点，car3就会启动。</p><h2 id="_14-5-示例-等待多个事件都发生" tabindex="-1"><a class="header-anchor" href="#_14-5-示例-等待多个事件都发生" aria-hidden="true">#</a> 14.5 示例: 等待多个事件都发生</h2><p>本节代码为：25_eventgroup_and，主要看nwatch\\game2.c。</p><p>使用遥控器控制car1、car2。car1运行到终点后，会设置bit0事件；car2运行到终点后，会设置bit1事件；car3等待bit0、bit1的所有事件</p><p>跟1302_eventgroup_or相比，只是car3的代码发生了变化。car3等待bit0、bit1事件，实验“与”的关系（倒数第2个参数），代码如下：</p><div class="language-c line-numbers-mode" data-ext="c"><pre class="language-c"><code><span class="token number">225</span>   <span class="token comment">/* 等待事件:bit0 or bit1 */</span>

<span class="token number">226</span>   <span class="token function">xEventGroupWaitBits</span><span class="token punctuation">(</span>g_xEventCar<span class="token punctuation">,</span> <span class="token punctuation">(</span><span class="token number">1</span><span class="token operator">&lt;&lt;</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token operator">|</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token operator">&lt;&lt;</span><span class="token number">1</span><span class="token punctuation">)</span><span class="token punctuation">,</span> pdTRUE<span class="token punctuation">,</span> pdTRUE<span class="token punctuation">,</span> portMAX_DELAY<span class="token punctuation">)</span><span class="token punctuation">;</span> 
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>实验现象：实验遥控器的1、2控制car1、car2，它们都到达终点后，car3才会启动。</p>`,89),p=[i];function l(c,o){return t(),s("div",null,p)}const u=n(e,[["render",l],["__file","chapter14.html.vue"]]);export{u as default};
