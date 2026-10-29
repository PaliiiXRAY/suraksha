import shutil
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.oxml import parse_xml

SRC = "final sih.pptx"
prs = Presentation(SRC)

# ==============================================================================
# SLIDE 1: Match font size of P0 for PS Category and TeamName
# ==============================================================================
s1 = prs.slides[0]
tb_s1 = s1.shapes[5]
tf_s1 = tb_s1.text_frame

p0_size = tf_s1.paragraphs[0].runs[1].font.size # 464947 EMU (~36.6 pt)

p3 = tf_s1.paragraphs[3]
p3.text = ""
r1 = p3.add_run()
r1.text = "• "
r1.font.name = "Arial"
r1.font.size = p0_size
r2 = p3.add_run()
r2.text = "PS Category- Software"
r2.font.name = "Arial"
r2.font.bold = True
r2.font.italic = True
r2.font.size = p0_size

p4 = tf_s1.paragraphs[4] if len(tf_s1.paragraphs) > 4 else tf_s1.add_paragraph()
p4.text = ""
r3 = p4.add_run()
r3.text = "• "
r3.font.name = "Arial"
r3.font.size = p0_size
r4 = p4.add_run()
r4.text = "TeamName- OOPS"
r4.font.name = "Arial"
r4.font.bold = True
r4.font.italic = True
r4.font.size = p0_size

print("Slide 1: matched exact font size for Category & TeamName")

# ==============================================================================
# SLIDE 2: Fix GOVERNMENT COMMAND position and double bullet
# ==============================================================================
s2 = prs.slides[1]

# Move Group 52 down so it sits comfortably inside the orange card (Group 50)
s2.shapes[21].top = 3700000

# Fix double bullet on first bullet in TextBox 105
tb_s2 = s2.shapes[41]
tf_s2 = tb_s2.text_frame

bullets_s2 = [
    ("Automated Thermal Ingestion", "Ingests NASA FIRMS (MODIS/VIIRS) hotspots and classifies them into 7 classes — Wildfire, Gas Flare, Power Plant, Mining, Crop Burn, Clandestine."),
    ("Confidence & Threat Scoring", "Calculates real-time AI Confidence (e.g., 91–97%) and Danger Severity based on peak temperature, spatial area (km²), and temporal baseline matching."),
    ("Tri-Tier Coordination", "Connects surveillance analysts, government incident commanders, and affected citizens within a single unified pipeline."),
    ("End-to-End Action", "Moves beyond passive detection by triggering automated emergency resource allocation, dynamic safe evacuation paths, and instant public SOS alerts.")
]

for p in list(tf_s2.paragraphs[1:]):
    p._p.getparent().remove(p._p)

p0 = tf_s2.paragraphs[0]
for r in list(p0.runs):
    r._r.getparent().remove(r._r)

for idx, (title, body) in enumerate(bullets_s2):
    p = p0 if idx == 0 else tf_s2.add_paragraph()
    p.space_after = Pt(3)
    p.line_spacing = 1.15
    
    r_bullet = p.add_run()
    r_bullet.text = "• "
    r_bullet.font.name = "Arial"
    r_bullet.font.size = Pt(12)
    r_bullet.font.color.rgb = RGBColor(15, 23, 42)
    
    r_title = p.add_run()
    r_title.text = title + ": "
    r_title.font.name = "Arial"
    r_title.font.bold = True
    r_title.font.size = Pt(12)
    r_title.font.color.rgb = RGBColor(15, 23, 42)
    
    r_body = p.add_run()
    r_body.text = body
    r_body.font.name = "Arial"
    r_body.font.size = Pt(12)
    r_body.font.color.rgb = RGBColor(51, 65, 85)

print("Slide 2: fixed double bullet and adjusted Group 52 top")

# ==============================================================================
# SLIDE 6: Fix Live Prototype URL color (strip hyperlink so it stays cyan/white)
# ==============================================================================
s6 = prs.slides[5]

# Style Live Prototype URL
g18 = s6.shapes[7]
for sub in g18.shapes:
    if sub.has_text_frame and "sih-thermal-intel" in sub.text:
        tf = sub.text_frame
        p = tf.paragraphs[0]
        p.text = ""
        r = p.add_run()
        r.text = "sih-thermal-intel.vercel.app"
        r.font.name = "Segoe UI"
        r.font.bold = True
        r.font.size = Pt(15)
        r.font.color.rgb = RGBColor(56, 189, 248) # Bright Cyan
        # Remove any hyperlink element from rPr
        rPr = r._r.get_or_add_rPr()
        for child in list(rPr):
            if child.tag.endswith('hlinkClick'):
                rPr.remove(child)

# Put Video Demo neatly inside the Team/Agency card (Group 29 / TextBox 31)
g29 = s6.shapes[11]
for sub in g29.shapes:
    if sub.has_text_frame and "Agency Partner" in sub.text:
        tf = sub.text_frame
        tf.clear()
        lines = [
            ("Problem Statement ID:", " SIH26162"),
            ("Agency Partner:", " NTRO"),
            ("Demo Walkthrough:", " youtu.be/PLZEVJ_CP2S9I")
        ]
        for i, (k, v) in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.space_after = Pt(2)
            rk = p.add_run()
            rk.text = k
            rk.font.name = "Segoe UI"
            rk.font.bold = True
            rk.font.size = Pt(11)
            rk.font.color.rgb = RGBColor(30, 41, 59)
            rv = p.add_run()
            rv.text = v
            rv.font.name = "Segoe UI"
            rv.font.size = Pt(11)
            rv.font.color.rgb = RGBColor(71, 85, 105)

# Remove the stray YouTube textbox (Shape 15)
sh_yt = s6.shapes[15]
s6.shapes._spTree.remove(sh_yt._element)
print("Slide 6: embedded demo link into agency card & removed stray box")

prs.save(SRC)
print("Saved all refinements to final sih.pptx!")
